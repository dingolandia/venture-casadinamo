import type { VendureConfig } from '@vendure/core';
import { config as configFromBackup } from './vendure-config.backup.js';

export const config = configFromBackup as VendureConfig;
