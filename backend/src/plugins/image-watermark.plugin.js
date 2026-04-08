"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImageWatermarkPlugin = exports.WatermarkPreviewStrategy = void 0;
const core_1 = require("@vendure/core");
const fs_1 = __importDefault(require("fs"));
const sharp_1 = __importDefault(require("sharp"));
const path_1 = __importDefault(require("path"));
class WatermarkPreviewStrategy {
    async generatePreviewImage(ctx, mimeType, data) {
        try {
            // Caminho relativo ao projeto (funciona em dev). Em prod, certifique-se de copiar a imagem.
            const watermarkPath = path_1.default.resolve(process.cwd(), "src", "plugins", "images", "watermark.png");
            const exists = fs_1.default.existsSync(watermarkPath);
            core_1.Logger.info(`WatermarkPreviewStrategy: start; mimeType=${mimeType}; dataSize=${data.length}; watermarkPath=${watermarkPath}; exists=${exists}`);
            if (!exists) {
                core_1.Logger.error(`WatermarkPreviewStrategy: watermark not found at ${watermarkPath}`);
                return data;
            }
            // Ignora pequenos erros/avisos de JPEG de entrada para não interromper o processamento
            const base = (0, sharp_1.default)(data, { failOnError: false, sequentialRead: true });
            const meta = await base.metadata();
            const width = meta.width || 0;
            const height = meta.height || 0;
            core_1.Logger.info(`WatermarkPreviewStrategy: imageSize=${width}x${height}`);
            const wmSharp = (0, sharp_1.default)(watermarkPath);
            const wmMeta = await wmSharp.metadata();
            const wmW = wmMeta.width || 0;
            const wmH = wmMeta.height || 0;
            // Usa o tamanho original do PNG; apenas recorta se a imagem for menor
            let overlayW = Math.min(width, wmW);
            let overlayH = Math.min(height, wmH);
            let watermark;
            if (wmW > overlayW || wmH > overlayH) {
                watermark = await (0, sharp_1.default)(watermarkPath)
                    .extract({ left: 0, top: 0, width: overlayW, height: overlayH })
                    .png()
                    .toBuffer();
            }
            else {
                watermark = await wmSharp.png().toBuffer();
            }
            core_1.Logger.info(`WatermarkPreviewStrategy: watermarkOrig=${wmW}x${wmH}; overlaySize=${overlayW}x${overlayH}`);
            const overlays = [];
            for (let ty = 0; ty < height; ty += overlayH) {
                for (let tx = 0; tx < width; tx += overlayW) {
                    overlays.push({ input: watermark, left: tx, top: ty, blend: "over" });
                }
            }
            core_1.Logger.info(`WatermarkPreviewStrategy: overlays=${overlays.length}`);
            let pipeline = base.composite(overlays);
            if (mimeType.includes("jpeg") || mimeType.includes("jpg")) {
                pipeline = pipeline.jpeg();
            }
            else if (mimeType.includes("png")) {
                pipeline = pipeline.png();
            }
            else {
                pipeline = pipeline.png();
            }
            const out = await pipeline.toBuffer();
            core_1.Logger.info(`WatermarkPreviewStrategy: success; outSize=${out.length}`);
            return out;
        }
        catch (err) {
            core_1.Logger.error(`Erro ao aplicar marca d’água: ${(err === null || err === void 0 ? void 0 : err.message) || err}`);
            return data;
        }
    }
}
exports.WatermarkPreviewStrategy = WatermarkPreviewStrategy;
let ImageWatermarkPlugin = class ImageWatermarkPlugin {
};
exports.ImageWatermarkPlugin = ImageWatermarkPlugin;
exports.ImageWatermarkPlugin = ImageWatermarkPlugin = __decorate([
    (0, core_1.VendurePlugin)({
        imports: [core_1.PluginCommonModule],
    })
], ImageWatermarkPlugin);
