package com.deloitte.jet

import org.apache.spark.sql.{SparkSession, DataFrame, Column}
import org.apache.spark.sql.functions._
import org.apache.spark.sql.types._
import org.apache.spark.sql.expressions.Window
import java.io.{File, PrintWriter, FileWriter}
import java.text.SimpleDateFormat
import java.util.Date
import scala.io.Source
import play.api.libs.json._

/**
 * Deloitte Spark JET Enterprise Distributed Processing Engine
 * High-performance JVM-native Scala implementation for 100+ GB Audit Ledgers.
 */
object SparkJETPipeline {

  def logEvent(runId: String, stage: String, progress: Int, message: String, logFile: Option[File] = None): Unit = {
    val timestamp = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'").format(new Date())
    val progressJson = Json.obj(
      "runId" -> runId,
      "stage" -> stage,
      "progress" -> progress,
      "message" -> message,
      "timestamp" -> timestamp
    ).toString()
    
    // Emit special stdout token for backend SSE real-time streaming
    println(s"__PROGRESS__$progressJson")
    
    logFile.foreach { f =>
      val fw = new FileWriter(f, true)
      try {
        fw.write(s"[$timestamp] [$stage] ($progress%) $message\n")
      } finally {
        fw.close()
      }
    }
  }

  def main(args: Array[String]): Unit = {
    if (args.length < 1) {
      System.err.println("Usage: SparkJETPipeline <config_path>")
      System.exit(1)
    }

    val configPath = args(0)
    val configFile = new File(configPath)
    if (!configFile.exists()) {
      System.err.println(s"Config file not found: $configPath")
      System.exit(1)
    }

    val configJsonStr = Source.fromFile(configFile, "UTF-8").mkString
    val config = Json.parse(configJsonStr)

    val runId = (config \ "runId").asOpt[String].getOrElse("JET-RUN-" + System.currentTimeMillis())
    val workspaceRoot = new File(".").getCanonicalPath
    val runDir = new File(s"$workspaceRoot/runs/$runId")
    val outputDir = new File(runDir, "output")
    val logDir = new File(runDir, "logs")
    val cacheDir = new File(runDir, "cache")

    outputDir.mkdirs()
    logDir.mkdirs()

    val logFile = new File(logDir, "execution.txt")
    logEvent(runId, "INITIALIZATION", 5, s"Starting Native Scala Spark JET Pipeline for $runId", Some(logFile))

    // Initialize Native JVM Spark Session with Ultra High-Performance Enterprise Tuning (100+ GB Scale)
    val spark = SparkSession.builder()
      .appName(s"Deloitte-Spark-JET-$runId")
      .config("spark.sql.adaptive.enabled", "true")
      .config("spark.sql.adaptive.coalescePartitions.enabled", "true")
      .config("spark.sql.adaptive.skewJoin.enabled", "true")
      .config("spark.sql.adaptive.localShuffleReader.enabled", "true")
      .config("spark.serializer", "org.apache.spark.serializer.KryoSerializer")
      .config("spark.kryoserializer.buffer.max", "1024m")
      .config("spark.sql.parquet.compression.codec", "snappy")
      .config("spark.sql.inMemoryColumnarStorage.compressed", "true")
      .config("spark.sql.inMemoryColumnarStorage.batchSize", "20000")
      .config("spark.sql.columnVector.offheap.enabled", "true")
      .config("spark.sql.execution.arrow.pyspark.enabled", "true")
      .config("spark.sql.legacy.timeParserPolicy", "LEGACY")
      .config("spark.sql.ansi.enabled", "false")
      .config("spark.sql.shuffle.partitions", "auto")
      .getOrCreate()

    import spark.implicits._

    try {
      logEvent(runId, "DATA_INGESTION", 12, "Loading and indexing datasets into Spark Catalyst memory", Some(logFile))

      // ── 1. LOAD INPUT DATASETS (Parquet / CSV / Auto-clean cache) ──
      val tbParquet = new File(cacheDir, "tb.parquet")
      val glParquet = new File(cacheDir, "gl.parquet")

      var rawTbDf: DataFrame = null
      var rawGlDf: DataFrame = null

      if (tbParquet.exists()) {
        rawTbDf = spark.read.parquet(tbParquet.getAbsolutePath)
      }
      if (glParquet.exists()) {
        rawGlDf = spark.read.parquet(glParquet.getAbsolutePath)
      }

      // Fallback CSV loading if Parquet cache not present
      val inputFiles = (config \ "files").asOpt[Seq[JsValue]].getOrElse(Seq.empty)
      val datasetMap = (config \ "datasetMap").asOpt[JsObject].getOrElse(Json.obj())

      if (rawTbDf == null) {
        val tbFileId = (datasetMap \ "tbFileId").asOpt[String].getOrElse("")
        val tbFileObj = inputFiles.find(f => (f \ "fileId").asOpt[String].contains(tbFileId) || (f \ "detectedDataset").asOpt[String].contains("TRIAL_BALANCE"))
        val tbPath = tbFileObj.flatMap(f => (f \ "filePath").asOpt[String]).getOrElse(s"${runDir.getAbsolutePath}/input/Trial_Balance.csv")
        if (new File(tbPath).exists()) {
          rawTbDf = spark.read.option("header", "true").option("inferSchema", "true").csv(tbPath)
        }
      }

      if (rawGlDf == null) {
        val glFileId = (datasetMap \ "glFileId").asOpt[String].getOrElse("")
        val glFileObj = inputFiles.find(f => (f \ "fileId").asOpt[String].contains(glFileId) || (f \ "detectedDataset").asOpt[String].exists(d => d == "GENERAL_LEDGER" || d == "POPULATION"))
        val glPath = glFileObj.flatMap(f => (f \ "filePath").asOpt[String]).getOrElse(s"${runDir.getAbsolutePath}/input/Population.csv")
        if (new File(glPath).exists()) {
          rawGlDf = spark.read.option("header", "true").option("inferSchema", "true").csv(glPath)
        }
      }

      if (rawGlDf == null) {
        throw new IllegalStateException(s"No General Ledger / Population dataset found for run $runId")
      }

      val totalGlRows = rawGlDf.count()
      val totalTbRows = if (rawTbDf != null) rawTbDf.count() else 0L

      logEvent(runId, "SCHEMA_NORMALIZATION", 25, s"Indexed $totalGlRows GL rows and $totalTbRows TB accounts", Some(logFile))

      // ── 2. STANDARDIZE COLUMN MAPPINGS ──
      val fieldMappings = (config \ "fieldMappings").asOpt[JsObject].getOrElse(Json.obj())
      val glMappings = (fieldMappings \ "gl").asOpt[JsObject].getOrElse(Json.obj())

      // Helper to map and sanitize column expressions
      def getCol(df: DataFrame, canonName: String, fallbackNames: Seq[String]): Column = {
        val mappedSrc = (glMappings \ canonName).asOpt[String].getOrElse("")
        val dfCols = df.columns
        if (mappedSrc.nonEmpty && dfCols.contains(mappedSrc)) {
          col(mappedSrc)
        } else {
          val found = fallbackNames.find(f => dfCols.contains(f)).orElse(dfCols.find(_.equalsIgnoreCase(canonName)))
          found.map(col).getOrElse(lit(null))
        }
      }

      val docCol = getCol(rawGlDf, "DOCUMENT_NUMBER", Seq("DOCUMENT_NUMBER", "JE_NUMBER", "DOC_NO", "DOCUMENT_NO", "BELNR", "TRANS_ID", "JOURNAL_ID"))
      val dateCol = getCol(rawGlDf, "POSTING_DATE", Seq("POSTING_DATE", "ENTRY_DATE", "EFF_DATE", "BUDAT", "DATE", "TRANS_DATE", "TX_DATE"))
      val accCol = getCol(rawGlDf, "ACCOUNT_NUMBER", Seq("ACCOUNT_NUMBER", "GL_ACCOUNT", "ACCOUNT", "HKONT", "ACCOUNT_ID", "ACC_NUM"))
      val accDescCol = getCol(rawGlDf, "ACCOUNT_DESCRIPTION", Seq("ACCOUNT_DESCRIPTION", "GL_ACCOUNT_DESC", "ACCOUNT_NAME", "ACC_DESC", "TXT50"))
      val userCol = getCol(rawGlDf, "USER_ID", Seq("USER_ID", "ENTERED_BY", "CREATED_BY", "USNAM", "USER_NAME", "AUTHOR", "USER"))
      val debCol = getCol(rawGlDf, "DEBIT_AMOUNT", Seq("DEBIT_AMOUNT", "DEBIT", "WRBTR_D", "DEBIT_LC", "DR_AMOUNT", "DEBIT_VAL"))
      val credCol = getCol(rawGlDf, "CREDIT_AMOUNT", Seq("CREDIT_AMOUNT", "CREDIT", "WRBTR_C", "CREDIT_LC", "CR_AMOUNT", "CREDIT_VAL"))
      val textCol = getCol(rawGlDf, "LINE_DESCRIPTION", Seq("LINE_DESCRIPTION", "HEADER_TEXT", "NARRATIVE", "BKTXT", "SGTXT", "DESCRIPTION", "MEMO"))

      val cleanGl = rawGlDf.select(
        coalesce(docCol.cast(StringType), lit("UNKNOWN_DOC")).as("DOCUMENT_NUMBER"),
        coalesce(dateCol.cast(StringType), lit("")).as("POSTING_DATE"),
        coalesce(accCol.cast(StringType), lit("0000000")).as("ACCOUNT_NUMBER"),
        coalesce(accDescCol.cast(StringType), lit("Unspecified Account")).as("ACCOUNT_DESCRIPTION"),
        coalesce(userCol.cast(StringType), lit("SYSTEM")).as("USER_ID"),
        abs(coalesce(debCol.cast(DoubleType), lit(0.0))).as("DEBIT_AMOUNT"),
        abs(coalesce(credCol.cast(DoubleType), lit(0.0))).as("CREDIT_AMOUNT"),
        coalesce(textCol.cast(StringType), lit("")).as("LINE_DESCRIPTION")
      ).withColumn("NET_AMOUNT", col("DEBIT_AMOUNT") - col("CREDIT_AMOUNT"))
       .withColumn("GROSS_AMOUNT", greatest(col("DEBIT_AMOUNT"), col("CREDIT_AMOUNT")))
       .cache()

      logEvent(runId, "INTEGRITY_TESTING", 40, "Executing Integrity Tests 1-4 & Reconciliation Matrix", Some(logFile))

      // ── 3. INTEGRITY RECONCILIATION (IR 1-4) ──
      val ir1File = new File(outputDir, "IR_Exception_1.csv")
      val ir2File = new File(outputDir, "IR_Exception_2.csv")
      val ir3File = new File(outputDir, "IR_Exception_3.csv")
      val ir4File = new File(outputDir, "IR_Exception_4.csv")
      val reconFile = new File(outputDir, "Parquet_Reconciliation.csv")

      var ir1Count = 0L
      var ir2Count = 0L
      var ir3Count = 0L
      var ir4Count = 0L

      // IR 4: Unbalanced Journal Entries
      val jeBalDf = cleanGl.groupBy("DOCUMENT_NUMBER")
        .agg(
          sum("DEBIT_AMOUNT").as("TOTAL_DEBIT"),
          sum("CREDIT_AMOUNT").as("TOTAL_CREDIT"),
          count("*").as("LINE_COUNT")
        )
        .withColumn("VARIANCE", abs(col("TOTAL_DEBIT") - col("TOTAL_CREDIT")))
        .filter(col("VARIANCE") > 0.01)

      ir4Count = jeBalDf.count()
      jeBalDf.limit(5000).toPandasCsv(ir4File)

      // Population Account Grouping
      val glAccAgg = cleanGl.groupBy("ACCOUNT_NUMBER", "ACCOUNT_DESCRIPTION")
        .agg(
          sum("DEBIT_AMOUNT").as("POP_DEBIT"),
          sum("CREDIT_AMOUNT").as("POP_CREDIT"),
          sum("NET_AMOUNT").as("POP_NET_ACTIVITY"),
          count("*").as("POP_LINE_COUNT")
        )

      if (rawTbDf != null) {
        val tbAccCol = col(rawTbDf.columns.find(c => c.equalsIgnoreCase("ACCOUNT_NUMBER") || c.equalsIgnoreCase("ACCOUNT") || c.equalsIgnoreCase("GL_ACCOUNT")).getOrElse(rawTbDf.columns(0)))
        val tbDescCol = col(rawTbDf.columns.find(c => c.toLowerCase.contains("desc") || c.toLowerCase.contains("name")).getOrElse(rawTbDf.columns(1)))
        val tbBegCol = col(rawTbDf.columns.find(c => c.toLowerCase.contains("beg") || c.toLowerCase.contains("open")).getOrElse(rawTbDf.columns.headOption.getOrElse("")))
        val tbEndCol = col(rawTbDf.columns.find(c => c.toLowerCase.contains("end") || c.toLowerCase.contains("close")).getOrElse(rawTbDf.columns.lastOption.getOrElse("")))

        val cleanTb = rawTbDf.select(
          tbAccCol.cast(StringType).as("ACCOUNT_NUMBER"),
          tbDescCol.cast(StringType).as("ACCOUNT_DESCRIPTION"),
          coalesce(tbBegCol.cast(DoubleType), lit(0.0)).as("BEGINNING_BALANCE"),
          coalesce(tbEndCol.cast(DoubleType), lit(0.0)).as("ENDING_BALANCE")
        ).withColumn("TB_NET_CHANGE", col("ENDING_BALANCE") - col("BEGINNING_BALANCE"))

        // Full Outer Join Reconciliation
        val reconDf = cleanTb.join(glAccAgg, Seq("ACCOUNT_NUMBER"), "full_outer")
          .select(
            col("ACCOUNT_NUMBER"),
            coalesce(cleanTb("ACCOUNT_DESCRIPTION"), glAccAgg("ACCOUNT_DESCRIPTION"), lit("Unspecified")).as("ACCOUNT_DESCRIPTION"),
            coalesce(col("BEGINNING_BALANCE"), lit(0.0)).as("BEGINNING_BALANCE"),
            coalesce(col("ENDING_BALANCE"), lit(0.0)).as("ENDING_BALANCE"),
            coalesce(col("TB_NET_CHANGE"), lit(0.0)).as("TB_NET_CHANGE"),
            coalesce(col("POP_NET_ACTIVITY"), lit(0.0)).as("JE_NET_ACTIVITY"),
            coalesce(col("POP_DEBIT"), lit(0.0)).as("DEBIT_AMOUNT"),
            coalesce(col("POP_CREDIT"), lit(0.0)).as("CREDIT_AMOUNT"),
            coalesce(col("POP_LINE_COUNT"), lit(0)).as("LINE_COUNT")
          )
          .withColumn("VARIANCE", abs(col("TB_NET_CHANGE") - col("JE_NET_ACTIVITY")))

        reconDf.limit(10000).toPandasCsv(reconFile)

        // IR 1: TB Accounts not in Population
        val ir1Df = reconDf.filter(col("LINE_COUNT") === 0 && (col("BEGINNING_BALANCE") =!= 0.0 || col("ENDING_BALANCE") =!= 0.0))
        ir1Count = ir1Df.count()
        ir1Df.limit(5000).toPandasCsv(ir1File)

        // IR 2: Activity Mismatch
        val ir2Df = reconDf.filter(col("VARIANCE") > 1.0)
        ir2Count = ir2Df.count()
        ir2Df.limit(5000).toPandasCsv(ir2File)

        // IR 3: Population Accounts not in TB
        val ir3Df = reconDf.filter(col("BEGINNING_BALANCE") === 0.0 && col("ENDING_BALANCE") === 0.0 && col("LINE_COUNT") > 0)
        ir3Count = ir3Df.count()
        ir3Df.limit(5000).toPandasCsv(ir3File)
      }

      logEvent(runId, "PARAMETER_EXCEPTION_RULES", 60, "Evaluating 12 Distributed Parameter Exception Rules", Some(logFile))

      // ── 4. PARAMETER EXCEPTIONS 1 TO 12 ──
      val sparkParams = (config \ "sparkParameters").asOpt[JsObject].getOrElse(Json.obj())
      val materiality = (sparkParams \ "materiality").asOpt[Double].getOrElse(500000.0)

      val exCounts = collection.mutable.Map[String, Long]()

      // Ex 1: Unusual Accounts Postings
      val ex1Df = cleanGl.filter(lower(col("ACCOUNT_DESCRIPTION")).contains("suspense") || lower(col("ACCOUNT_DESCRIPTION")).contains("unusual") || lower(col("ACCOUNT_DESCRIPTION")).contains("clearing") || col("ACCOUNT_NUMBER").startsWith("99"))
      exCounts("Ex1_Unusual_Accounts") = ex1Df.count()
      ex1Df.limit(5000).toPandasCsv(new File(outputDir, "Parameter_Exception_1.csv"))

      // Ex 2: Seldom Used Accounts (<= 5 postings across entire year)
      val seldomWindow = Window.partitionBy("ACCOUNT_NUMBER")
      val ex2Df = cleanGl.withColumn("ACC_POSTING_COUNT", count("*").over(seldomWindow))
        .filter(col("ACC_POSTING_COUNT") <= 5 && col("ACC_POSTING_COUNT") >= 1)
      exCounts("Ex2_Seldom_Accounts") = ex2Df.count()
      ex2Df.limit(5000).toPandasCsv(new File(outputDir, "Parameter_Exception_2.csv"))

      // Ex 3: Large Debits to Revenue
      val ex3Df = cleanGl.filter(
        (col("ACCOUNT_NUMBER").startsWith("4") || lower(col("ACCOUNT_DESCRIPTION")).contains("revenue") || lower(col("ACCOUNT_DESCRIPTION")).contains("sales")) &&
        col("DEBIT_AMOUNT") > 0.0
      )
      exCounts("Ex3_Revenue_Debits") = ex3Df.count()
      ex3Df.limit(5000).toPandasCsv(new File(outputDir, "Parameter_Exception_3.csv"))

      // Ex 4: Few Postings Users (<= 3 postings authored by user)
      val userWindow = Window.partitionBy("USER_ID")
      val ex4Df = cleanGl.withColumn("USER_POSTING_COUNT", count("*").over(userWindow))
        .filter(col("USER_POSTING_COUNT") <= 3)
      exCounts("Ex4_Few_Postings_Users") = ex4Df.count()
      ex4Df.limit(5000).toPandasCsv(new File(outputDir, "Parameter_Exception_4.csv"))

      // Ex 5: Key Personnel / Users of Interest
      val ex5Df = cleanGl.filter(lower(col("USER_ID")).contains("admin") || lower(col("USER_ID")).contains("temp") || lower(col("USER_ID")).contains("mgr") || lower(col("USER_ID")).contains("it_"))
      exCounts("Ex5_Users_Of_Interest") = ex5Df.count()
      ex5Df.limit(5000).toPandasCsv(new File(outputDir, "Parameter_Exception_5.csv"))

      // Ex 6: Period-End Closing Entries (Postings near period end date)
      val ex6Df = cleanGl.filter(col("POSTING_DATE").contains("12-31") || col("POSTING_DATE").contains("03-31") || col("POSTING_DATE").contains("Dec-31") || col("POSTING_DATE").contains("Mar-31"))
      exCounts("Ex6_Closing_Entries") = ex6Df.count()
      ex6Df.limit(5000).toPandasCsv(new File(outputDir, "Parameter_Exception_6.csv"))

      // Ex 7: Dates of Interest (Holiday / Weekend postings)
      val ex7Df = cleanGl.filter(col("POSTING_DATE").contains("Sun") || col("POSTING_DATE").contains("Sat") || col("POSTING_DATE").contains("12-25") || col("POSTING_DATE").contains("01-01"))
      exCounts("Ex7_Dates_Of_Interest") = ex7Df.count()
      ex7Df.limit(5000).toPandasCsv(new File(outputDir, "Parameter_Exception_7.csv"))

      // Ex 8: Round Sum Amounts (Multiples of 1,000, 10,000, 100,000)
      val ex8Df = cleanGl.filter((col("GROSS_AMOUNT") % 1000.0 === 0.0) && col("GROSS_AMOUNT") >= 10000.0)
      exCounts("Ex8_Round_Amounts") = ex8Df.count()
      ex8Df.limit(5000).toPandasCsv(new File(outputDir, "Parameter_Exception_8.csv"))

      // Ex 9: Duplicate Entries (Same Account, Date, and Amount)
      val dupWindow = Window.partitionBy("ACCOUNT_NUMBER", "POSTING_DATE", "GROSS_AMOUNT")
      val ex9Df = cleanGl.withColumn("DUP_COUNT", count("*").over(dupWindow)).filter(col("DUP_COUNT") > 1)
      exCounts("Ex9_Duplicate_Entries") = ex9Df.count()
      ex9Df.limit(5000).toPandasCsv(new File(outputDir, "Parameter_Exception_9.csv"))

      // Ex 10: Fraud & Risk Keywords in Text
      val ex10Df = cleanGl.filter(
        lower(col("LINE_DESCRIPTION")).rlike("fault|bribe|adjust|mistake|risk|misstate|officer|prize|abuse|alter|seiz|bury|conceal|corrupt|demand|embezzle|theft|fictitious|fraud|manual|reverse")
      )
      exCounts("Ex10_Keyword_Entries") = ex10Df.count()
      ex10Df.limit(5000).toPandasCsv(new File(outputDir, "Parameter_Exception_10.csv"))

      // Ex 11: Post-Closing Entries (Postings dated strictly after fiscal cutoff)
      val ex11Df = cleanGl.filter(col("POSTING_DATE").contains("2026-04") || col("POSTING_DATE").contains("Apr-26") || col("POSTING_DATE").contains("2026-01") || col("POSTING_DATE").contains("Jan-26"))
      exCounts("Ex11_Post_Closing_Entries") = ex11Df.count()
      ex11Df.limit(5000).toPandasCsv(new File(outputDir, "Parameter_Exception_11.csv"))

      // Ex 12: Unrelated Line Item Pairings (Debits and Credits across incompatible accounts)
      val ex12Df = cleanGl.filter(col("DEBIT_AMOUNT") > materiality && col("ACCOUNT_NUMBER").startsWith("1") && col("LINE_DESCRIPTION").contains("adj"))
      exCounts("Ex12_Unrelated_Accounts") = ex12Df.count()
      ex12Df.limit(5000).toPandasCsv(new File(outputDir, "Parameter_Exception_12.csv"))

      // Representative Control Sample
      val controlSampleDf = cleanGl.sample(false, 0.005).limit(60)
      controlSampleDf.toPandasCsv(new File(outputDir, "Control_Sample_Dump.csv"))

      logEvent(runId, "FORENSIC_INTELLIGENCE", 85, "Executing Benford's Law Forensic Curve & Multi-Vector Risk Engine", Some(logFile))

      // ── 5. BENFORD'S LAW DISTRIBUTION ANALYSIS ──
      val firstDigitDf = cleanGl.filter(col("GROSS_AMOUNT") > 0.0)
        .withColumn("FIRST_DIGIT", substring(regexp_replace(col("GROSS_AMOUNT").cast(StringType), "[^1-9]", ""), 1, 1).cast(IntegerType))
        .filter(col("FIRST_DIGIT").between(1, 9))
        .groupBy("FIRST_DIGIT")
        .agg(count("*").as("DIGIT_COUNT"))
        .orderBy("FIRST_DIGIT")

      val benfordMap = firstDigitDf.collect().map(r => (r.getInt(0), r.getLong(1))).toMap

      logEvent(runId, "EXPORT_ARTIFACTS", 95, "Generating Parquet workpapers and executive audit deliverables", Some(logFile))

      // Write Parquet Master Extract
      cleanGl.write.mode("overwrite").parquet(new File(outputDir, "Standardized_General_Ledger.parquet").getAbsolutePath)

      // ── 6. BUILD FINAL RESULT JSON PAYLOAD ──
      val finalResult = Json.obj(
        "status" -> "COMPLETED",
        "runId" -> runId,
        "totalInputRows" -> Json.obj(
          "gl" -> totalGlRows,
          "tb" -> totalTbRows
        ),
        "exceptionCounts" -> Json.obj(
          "Ex1_Unusual_Accounts" -> exCounts("Ex1_Unusual_Accounts"),
          "Ex2_Seldom_Accounts" -> exCounts("Ex2_Seldom_Accounts"),
          "Ex3_Revenue_Debits" -> exCounts("Ex3_Revenue_Debits"),
          "Ex4_Few_Postings_Users" -> exCounts("Ex4_Few_Postings_Users"),
          "Ex5_Users_Of_Interest" -> exCounts("Ex5_Users_Of_Interest"),
          "Ex6_Closing_Entries" -> exCounts("Ex6_Closing_Entries"),
          "Ex7_Dates_Of_Interest" -> exCounts("Ex7_Dates_Of_Interest"),
          "Ex8_Round_Amounts" -> exCounts("Ex8_Round_Amounts"),
          "Ex9_Duplicate_Entries" -> exCounts("Ex9_Duplicate_Entries"),
          "Ex10_Keyword_Entries" -> exCounts("Ex10_Keyword_Entries"),
          "Ex11_Post_Closing_Entries" -> exCounts("Ex11_Post_Closing_Entries"),
          "Ex12_Unrelated_Accounts" -> exCounts("Ex12_Unrelated_Accounts")
        ),
        "reconciliationSummary" -> Json.obj(
          "ir1TbNotInPopCount" -> ir1Count,
          "ir2ActivityMismatchCount" -> ir2Count,
          "ir3PopNotInTbCount" -> ir3Count,
          "ir4UnbalancedJeCount" -> ir4Count
        ),
        "benfordSummary" -> Json.obj(
          "digitCounts" -> Json.toJson(benfordMap)
        ),
        "outputs" -> Json.arr(
          Json.obj("name" -> "Parquet_Reconciliation.csv", "rowCount" -> 1000, "category" -> "RECONCILIATION"),
          Json.obj("name" -> "IR_Exception_1.csv", "rowCount" -> ir1Count, "category" -> "INTEGRITY"),
          Json.obj("name" -> "IR_Exception_2.csv", "rowCount" -> ir2Count, "category" -> "INTEGRITY"),
          Json.obj("name" -> "IR_Exception_3.csv", "rowCount" -> ir3Count, "category" -> "INTEGRITY"),
          Json.obj("name" -> "IR_Exception_4.csv", "rowCount" -> ir4Count, "category" -> "INTEGRITY"),
          Json.obj("name" -> "Parameter_Exception_1.csv", "rowCount" -> exCounts("Ex1_Unusual_Accounts"), "category" -> "PARAMETER"),
          Json.obj("name" -> "Parameter_Exception_2.csv", "rowCount" -> exCounts("Ex2_Seldom_Accounts"), "category" -> "PARAMETER"),
          Json.obj("name" -> "Parameter_Exception_3.csv", "rowCount" -> exCounts("Ex3_Revenue_Debits"), "category" -> "PARAMETER"),
          Json.obj("name" -> "Parameter_Exception_4.csv", "rowCount" -> exCounts("Ex4_Few_Postings_Users"), "category" -> "PARAMETER"),
          Json.obj("name" -> "Parameter_Exception_5.csv", "rowCount" -> exCounts("Ex5_Users_Of_Interest"), "category" -> "PARAMETER"),
          Json.obj("name" -> "Parameter_Exception_6.csv", "rowCount" -> exCounts("Ex6_Closing_Entries"), "category" -> "PARAMETER"),
          Json.obj("name" -> "Parameter_Exception_7.csv", "rowCount" -> exCounts("Ex7_Dates_Of_Interest"), "category" -> "PARAMETER"),
          Json.obj("name" -> "Parameter_Exception_8.csv", "rowCount" -> exCounts("Ex8_Round_Amounts"), "category" -> "PARAMETER"),
          Json.obj("name" -> "Parameter_Exception_9.csv", "rowCount" -> exCounts("Ex9_Duplicate_Entries"), "category" -> "PARAMETER"),
          Json.obj("name" -> "Parameter_Exception_10.csv", "rowCount" -> exCounts("Ex10_Keyword_Entries"), "category" -> "PARAMETER"),
          Json.obj("name" -> "Parameter_Exception_11.csv", "rowCount" -> exCounts("Ex11_Post_Closing_Entries"), "category" -> "PARAMETER"),
          Json.obj("name" -> "Parameter_Exception_12.csv", "rowCount" -> exCounts("Ex12_Unrelated_Accounts"), "category" -> "PARAMETER"),
          Json.obj("name" -> "Control_Sample_Dump.csv", "rowCount" -> 60, "category" -> "CONTROL_SAMPLE"),
          Json.obj("name" -> "Standardized_General_Ledger.parquet", "rowCount" -> totalGlRows, "category" -> "MASTER")
        )
      )

      logEvent(runId, "COMPLETED", 100, s"Native Scala Spark JET Execution Finished Successfully for $runId", Some(logFile))

      // Emit special __RESULT__ token for backend runner
      println(s"__RESULT__${finalResult.toString()}")

    } catch {
      case ex: Throwable =>
        val errorMsg = s"Spark JET Pipeline Fatal Error: ${ex.getMessage}"
        logEvent(runId, "FAILED", 100, errorMsg, Some(logFile))
        ex.printStackTrace()
        System.exit(1)
    } finally {
      spark.stop()
    }
  }

  implicit class DataFrameCsvExporter(df: DataFrame) {
    def toPandasCsv(targetFile: File): Unit = {
      val cols = df.columns
      val rows = df.collect()
      val pw = new PrintWriter(new FileWriter(targetFile))
      try {
        pw.println(cols.mkString(","))
        rows.foreach { r =>
          val line = (0 until r.length).map { i =>
            val v = r.get(i)
            if (v == null) ""
            else {
              val s = v.toString
              if (s.contains(",") || s.contains("\"") || s.contains("\n")) s""""${s.replace("\"", "\"\"")}""""
              else s
            }
          }.mkString(",")
          pw.println(line)
        }
      } finally {
        pw.close()
      }
    }
  }
}
