import 'dotenv/config';
import { execSync } from 'child_process';

execSync('tsc && vite build && electron-builder', { stdio: 'inherit' });
