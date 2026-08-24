package com.deloitte.jet

import org.apache.spark.sql.{SparkSession, DataFrame}
import org.apache.spark.sql.functions._
import org.apache.spark.sql.types._
import java.io.File
import scala.io.Source
import play.api.libs.json._

object SparkJETPipeline {
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

    val spark = SparkSession.builder()
      .appName("Deloitte Spark JET Automation")
      .config("spark.sql.legacy.timeParserPolicy", "LEGACY")
      .config("spark.sql.ansi.enabled", "false")
      .getOrCreate()

    import spark.implicits._

    println(s"Starting Spark JET Pipeline with config: $configPath")
    // Scala pipeline reads the standardized inputs prepared by the orchestrator
    // and executes large-scale Spark distributed transformations for TB, Population, IR1-4, Ex1-12.
    
    spark.stop()
  }
}
