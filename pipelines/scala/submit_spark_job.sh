#!/usr/bin/env bash
# ==============================================================================
# Deloitte Automated JET - Scala Spark Job Submitter (Linux / macOS / Cluster)
# ==============================================================================

WORKFLOW=${1:-SPARK_JET}
CONFIG_PATH=${2:-"../../runs/JET-20260830-012/config/run_config.json"}

if [ "$WORKFLOW" = "OMNIA_JET" ]; then
    MAIN_CLASS="com.deloitte.jet.OmniaJETPipeline"
else
    MAIN_CLASS="com.deloitte.jet.SparkJETPipeline"
fi

JAR_PATH="target/scala-2.12/jet-spark-pipeline_2.12-1.0.jar"

if [ ! -f "$JAR_PATH" ]; then
    echo "[ERROR] JAR not found at $JAR_PATH"
    echo "Please run 'sbt package' inside pipelines/scala first."
    exit 1
fi

echo "[INFO] Submitting Scala Spark Job..."
echo "[INFO] Main Class : $MAIN_CLASS"
echo "[INFO] JAR Path   : $JAR_PATH"
echo "[INFO] Config Path: $CONFIG_PATH"

spark-submit \
  --class "$MAIN_CLASS" \
  --master "local[*]" \
  --driver-memory 4g \
  --executor-memory 8g \
  "$JAR_PATH" \
  "$CONFIG_PATH"
