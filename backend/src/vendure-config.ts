import type { VendureConfig } from '@vendure/core';
import { config as configFromBackup } from './vendure-config.js';

export const config = configFromBackup as VendureConfig;
