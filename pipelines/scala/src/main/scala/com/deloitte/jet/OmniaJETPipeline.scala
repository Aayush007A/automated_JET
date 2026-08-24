package com.deloitte.jet

import org.apache.spark.sql.{SparkSession, DataFrame}
import org.apache.spark.sql.functions._
import org.apache.spark.sql.types._
import java.io.File
import play.api.libs.json._

object OmniaJETPipeline {
  def main(args: Array[String]): Unit = {
    if (args.length < 1) {
      System.err.println("Usage: OmniaJETPipeline <config_path>")
      System.exit(1)
    }

    val configPath = args(0)
    val spark = SparkSession.builder()
      .appName("Deloitte Omnia JET Automation")
      .config("spark.sql.legacy.timeParserPolicy", "LEGACY")
      .config("spark.sql.ansi.enabled", "false")
      .getOrCreate()

    println(s"Starting Omnia JET Pipeline with config: $configPath")
    // Spark-based Omnia reconciliation, DQC 01a-20 execution, and CDM parquet generation.

    spark.stop()
  }
}
