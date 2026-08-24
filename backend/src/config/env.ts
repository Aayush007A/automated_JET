import path from 'path';
import dotenv from 'dotenv';
import fs from 'fs';

// Load root or local .env
const rootEnvPath = path.resolve(__dirname, '../../../.env');
const localEnvPath = path.resolve(__dirname, '../../.env');

if (fs.existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath });
} else if (fs.existsSync(localEnvPath)) {
  dotenv.config({ path: localEnvPath });
} else {
  dotenv.config();
}

const workspaceRoot = path.resolve(__dirname, '../../../');

export const ENV = {
  PORT: parseInt(process.env.PORT || '5000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  JWT_SECRET: process.env.JWT_SECRET || 'jet_secret_key_deloitte_2026_enterprise_audit_platform_token',
  
  WORKSPACE_ROOT: workspaceRoot,
  UPLOAD_DIR: path.resolve(workspaceRoot, process.env.UPLOAD_DIR || 'uploads'),
  RUN_DIR: path.resolve(workspaceRoot, process.env.RUN_DIR || 'runs'),
  LOG_DIR: path.resolve(workspaceRoot, process.env.LOG_DIR || 'logs'),
  OUTPUT_DIR: path.resolve(workspaceRoot, process.env.OUTPUT_DIR || 'outputs'),
  CONFIG_DIR: path.resolve(workspaceRoot, process.env.CONFIG_DIR || 'config'),
  
  SPARK_MODE: (process.env.SPARK_MODE || 'LOCAL') as 'LOCAL' | 'DOCKER' | 'DATABRICKS',
  PYSPARK_COMMAND: process.env.PYSPARK_COMMAND || 'python',
  SPARK_SUBMIT_COMMAND: process.env.SPARK_SUBMIT_COMMAND || 'spark-submit',
  SCALA_SPARK_JAR: path.resolve(workspaceRoot, process.env.SCALA_SPARK_JAR || 'pipelines/scala/target/scala-2.12/jet-pipeline_2.12-1.0.jar'),
  SCALA_MAIN_CLASS: process.env.SCALA_MAIN_CLASS || 'com.deloitte.jet.SparkJETPipeline',
  
  MAX_UPLOAD_SIZE_MB: parseInt(process.env.MAX_UPLOAD_SIZE_MB || '500', 10),
};

// Ensure base directories exist
[ENV.UPLOAD_DIR, ENV.RUN_DIR, ENV.LOG_DIR, ENV.OUTPUT_DIR, ENV.CONFIG_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});
