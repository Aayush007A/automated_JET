#!/usr/bin/env node

/**
 * Deloitte Automated JET Platform - Unified Multi-Service Orchestrator
 *
 * Starts all three platform services concurrently with unified logging and graceful shutdown:
 * 1. AI Neural LLM Microservice (FastAPI on http://127.0.0.1:5005)
 * 2. Enterprise Backend API (Node.js/Express on http://localhost:5000)
 * 3. Executive Web Frontend (Vite/React on http://localhost:5173)
 */

const { spawn, execSync } = require('child_process');
const path = require('path');
const os = require('os');
const net = require('net');

const rootDir = __dirname;
const isWindows = os.platform() === 'win32';

// ANSI terminal colors
const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
};

const SERVICES = [
  {
    name: 'AI-LLM',
    tag: `${C.cyan}[AI-LLM]   ${C.reset}`,
    command: isWindows ? 'python' : 'python3',
    args: ['pipeline/local_llm_server.py'],
    cwd: rootDir,
    port: 5005,
    url: 'http://127.0.0.1:5005',
  },
  {
    name: 'BACKEND',
    tag: `${C.green}[BACKEND]  ${C.reset}`,
    command: isWindows ? 'npm.cmd' : 'npm',
    args: ['run', 'dev'],
    cwd: path.join(rootDir, 'backend'),
    port: 5000,
    url: 'http://localhost:5000',
  },
  {
    name: 'FRONTEND',
    tag: `${C.magenta}[FRONTEND] ${C.reset}`,
    command: isWindows ? 'npm.cmd' : 'npm',
    args: ['run', 'dev'],
    cwd: path.join(rootDir, 'frontend'),
    port: 5173,
    url: 'http://localhost:5173',
  },
];

const children = [];
let isShuttingDown = false;

function printBanner() {
  console.log(`
${C.bold}${C.green}==============================================================================${C.reset}
${C.bold}${C.white}           DELOITTE AUTOMATED JOURNAL ENTRY TESTING (JET) PLATFORM            ${C.reset}
${C.bold}${C.green}==============================================================================${C.reset}
  ${C.cyan}${C.bold}[1] AI Neural LLM Microservice${C.reset}    : ${C.white}http://127.0.0.1:5005${C.reset} (Port 5005)
  ${C.green}${C.bold}[2] Enterprise Backend API${C.reset}        : ${C.white}http://localhost:5000${C.reset} (Port 5000)
  ${C.magenta}${C.bold}[3] Executive Web Application${C.reset}     : ${C.white}http://localhost:5173${C.reset} (Port 5173)
${C.bold}${C.green}==============================================================================${C.reset}
  ${C.yellow}* Starting all services concurrently... Press ${C.bold}Ctrl+C${C.reset}${C.yellow} to terminate all services.${C.reset}
${C.bold}${C.green}==============================================================================${C.reset}
`);
}

function checkPort(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(false); // in use
      } else {
        resolve(true);
      }
    });
    server.once('listening', () => {
      server.close();
      resolve(true); // free
    });
    server.listen(port, '127.0.0.1');
  });
}

function waitForPort(port, host = '127.0.0.1', timeoutMs = 20000) {
  const start = Date.now();
  return new Promise((resolve) => {
    const interval = setInterval(() => {
      if (Date.now() - start > timeoutMs) {
        clearInterval(interval);
        resolve(false);
        return;
      }
      const socket = new net.Socket();
      socket.setTimeout(250);
      socket.once('connect', () => {
        socket.destroy();
        clearInterval(interval);
        resolve(true);
      });
      socket.once('error', () => {
        socket.destroy();
      });
      socket.once('timeout', () => {
        socket.destroy();
      });
      socket.connect(port, host);
    }, 250);
  });
}

function shouldFilterLine(line) {
  const l = line.toLowerCase();
  return (
    l.includes('userwarning') ||
    l.includes('futurewarning') ||
    l.includes('deprecationwarning') ||
    l.includes('pydanticdeprecated') ||
    l.includes('warnings.warn') ||
    l.includes('special tokens have been added') ||
    l.includes('resume_download') ||
    l.includes('read more about it in the') ||
    l.includes('fastapi docs for lifespan') ||
    l.includes('migration/2.13')
  );
}

function pipeOutput(stream, tag) {
  let buffer = '';
  stream.on('data', (chunk) => {
    buffer += chunk.toString();
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop(); // keep partial line in buffer
    for (const line of lines) {
      if (line.trim().length > 0 && !shouldFilterLine(line)) {
        console.log(`${tag} ${line}`);
      }
    }
  });
  stream.on('end', () => {
    if (buffer.trim().length > 0 && !shouldFilterLine(buffer)) {
      console.log(`${tag} ${buffer}`);
    }
  });
}

function killProcess(pid) {
  if (!pid) return;
  try {
    if (isWindows) {
      execSync(`taskkill /pid ${pid} /T /F`, { stdio: 'ignore' });
    } else {
      process.kill(-pid, 'SIGKILL');
    }
  } catch (e) {
    // Process already exited
  }
}

function shutdown(exitCode = 0) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`\n${C.yellow}${C.bold}[JET-CORE] Shutting down all services gracefully...${C.reset}`);

  for (const item of children) {
    if (item.process && item.process.pid) {
      console.log(`${C.gray}[JET-CORE] Stopping ${item.service.name} (PID ${item.process.pid})...${C.reset}`);
      killProcess(item.process.pid);
    }
  }

  console.log(`${C.green}${C.bold}[JET-CORE] All Deloitte JET services stopped.${C.reset}\n`);
  process.exit(exitCode);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
process.on('exit', () => shutdown(0));

async function start() {
  printBanner();

  const spawnService = async (service) => {
    const isFree = await checkPort(service.port);
    if (!isFree) {
      console.log(`${C.yellow}[JET-CORE] Note: Port ${service.port} for ${service.name} is already active or in use.${C.reset}`);
    }

    console.log(`${C.yellow}[JET-CORE] Launching ${service.name}... (${service.command} ${service.args.join(' ')})${C.reset}`);

    const child = spawn(service.command, service.args, {
      cwd: service.cwd,
      env: { ...process.env, PYTHONUNBUFFERED: '1', FORCE_COLOR: '1' },
      shell: isWindows,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    if (child.stdout) pipeOutput(child.stdout, service.tag);
    if (child.stderr) pipeOutput(child.stderr, service.tag);

    child.on('error', (err) => {
      console.error(`${C.red}[JET-CORE] Failed to launch ${service.name}: ${err.message}${C.reset}`);
    });

    child.on('exit', (code, signal) => {
      if (!isShuttingDown) {
        console.log(`${C.yellow}[JET-CORE] ${service.name} exited with code ${code ?? signal}.${C.reset}`);
      }
    });

    children.push({ service, process: child });
    return child;
  };

  const aiService = SERVICES.find((s) => s.name === 'AI-LLM');
  const backendService = SERVICES.find((s) => s.name === 'BACKEND');
  const frontendService = SERVICES.find((s) => s.name === 'FRONTEND');

  // 1. Launch AI-LLM server in background
  if (aiService) {
    await spawnService(aiService);
  }

  // 2. Launch Backend API
  if (backendService) {
    await spawnService(backendService);
    // Wait until Backend API on port 5000 is open before starting Vite
    console.log(`${C.gray}[JET-CORE] Waiting for Backend API on port 5000 to be ready...${C.reset}`);
    const ready = await waitForPort(5000, '127.0.0.1', 20000);
    if (ready) {
      console.log(`${C.green}[JET-CORE] Backend API is ready on port 5000!${C.reset}`);
    }
  }

  // 3. Launch Frontend (Vite)
  if (frontendService) {
    await spawnService(frontendService);
  }

  console.log(`\n${C.green}${C.bold}[JET-CORE] All 3 services initialized successfully!${C.reset}`);
  console.log(`${C.white}Open ${C.bold}http://localhost:5173${C.reset}${C.white} in your browser to begin testing.${C.reset}\n`);
}

start();
