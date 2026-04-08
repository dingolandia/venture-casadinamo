"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddShippingMethodToggle1762667275983 = void 0;
class AddShippingMethodToggle1762667275983 {
    async up(queryRunner) {
        await queryRunner.query(`CREATE TABLE "temporary_shipping_method" (
                "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
                "updatedAt" datetime NOT NULL DEFAULT (datetime('now')),
                "deletedAt" datetime,
                "code" varchar NOT NULL,
                "checker" TEXT NOT NULL,
                "calculator" TEXT NOT NULL,
                "fulfillmentHandlerCode" varchar NOT NULL,
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "customFieldsStorefrontenabled" boolean NOT NULL DEFAULT (1)
            )`, undefined);
        await queryRunner.query(`INSERT INTO "temporary_shipping_method"("createdAt","updatedAt","deletedAt","code","checker","calculator","fulfillmentHandlerCode","id")
             SELECT "createdAt","updatedAt","deletedAt","code","checker","calculator","fulfillmentHandlerCode","id" FROM "shipping_method"`, undefined);
        await queryRunner.query(`DROP TABLE "shipping_method"`, undefined);
        await queryRunner.query(`ALTER TABLE "temporary_shipping_method" RENAME TO "shipping_method"`, undefined);
    }
    async down(queryRunner) {
        await queryRunner.query(`CREATE TABLE "temporary_shipping_method" (
                "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
                "updatedAt" datetime NOT NULL DEFAULT (datetime('now')),
                "deletedAt" datetime,
                "code" varchar NOT NULL,
                "checker" TEXT NOT NULL,
                "calculator" TEXT NOT NULL,
                "fulfillmentHandlerCode" varchar NOT NULL,
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL
            )`, undefined);
        await queryRunner.query(`INSERT INTO "temporary_shipping_method"("createdAt","updatedAt","deletedAt","code","checker","calculator","fulfillmentHandlerCode","id")
             SELECT "createdAt","updatedAt","deletedAt","code","checker","calculator","fulfillmentHandlerCode","id" FROM "shipping_method"`, undefined);
        await queryRunner.query(`DROP TABLE "shipping_method"`, undefined);
        await queryRunner.query(`ALTER TABLE "temporary_shipping_method" RENAME TO "shipping_method"`, undefined);
    }
}
exports.AddShippingMethodToggle1762667275983 = AddShippingMethodToggle1762667275983;
