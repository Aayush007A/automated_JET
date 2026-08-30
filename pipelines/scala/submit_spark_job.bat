@echo off
REM ==============================================================================
REM Deloitte Automated JET - Scala Spark Job Submitter (Windows)
REM ==============================================================================

set WORKFLOW=%1
set CONFIG_PATH=%2

if "%WORKFLOW%"=="" set WORKFLOW=SPARK_JET
if "%CONFIG_PATH%"=="" set CONFIG_PATH=..\..\runs\JET-20260830-012\config\run_config.json

if "%WORKFLOW%"=="OMNIA_JET" (
    set MAIN_CLASS=com.deloitte.jet.OmniaJETPipeline
) else (
    set MAIN_CLASS=com.deloitte.jet.SparkJETPipeline
)

set JAR_PATH=target\scala-2.12\jet-spark-pipeline_2.12-1.0.jar

if not exist "%JAR_PATH%" (
    echo [ERROR] JAR not found at %JAR_PATH%
    echo Please run 'sbt package' inside pipelines\scala first.
    exit /b 1
)

echo [INFO] Submitting Scala Spark Job...
echo [INFO] Main Class : %MAIN_CLASS%
echo [INFO] JAR Path   : %JAR_PATH%
echo [INFO] Config Path: %CONFIG_PATH%

spark-submit ^
  --class %MAIN_CLASS% ^
  --master local[*] ^
  --driver-memory 4g ^
  --executor-memory 8g ^
  "%JAR_PATH%" ^
  "%CONFIG_PATH%"
