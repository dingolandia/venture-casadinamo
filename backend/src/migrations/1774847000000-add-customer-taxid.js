"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddCustomerTaxId1774847000000 = void 0;
class AddCustomerTaxId1774847000000 {
    async up(queryRunner) {
        await queryRunner.query(`CREATE TABLE "temporary_customer" (
                "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
                "updatedAt" datetime NOT NULL DEFAULT (datetime('now')),
                "deletedAt" datetime,
                "title" varchar,
                "firstName" varchar NOT NULL,
                "lastName" varchar NOT NULL,
                "phoneNumber" varchar,
                "emailAddress" varchar NOT NULL,
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "userId" integer,
                "customFieldsTaxid" varchar(255),
                UNIQUE ("userId"),
                CONSTRAINT "FK_93e9bbd4b5c9c05cf41f683253f" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION
            )`, undefined);
        await queryRunner.query(`INSERT INTO "temporary_customer"("createdAt","updatedAt","deletedAt","title","firstName","lastName","phoneNumber","emailAddress","id","userId")
             SELECT "createdAt","updatedAt","deletedAt","title","firstName","lastName","phoneNumber","emailAddress","id","userId" FROM "customer"`, undefined);
        await queryRunner.query(`DROP TABLE "customer"`, undefined);
        await queryRunner.query(`ALTER TABLE "temporary_customer" RENAME TO "customer"`, undefined);
    }
    async down(queryRunner) {
        await queryRunner.query(`CREATE TABLE "temporary_customer" (
                "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
                "updatedAt" datetime NOT NULL DEFAULT (datetime('now')),
                "deletedAt" datetime,
                "title" varchar,
                "firstName" varchar NOT NULL,
                "lastName" varchar NOT NULL,
                "phoneNumber" varchar,
                "emailAddress" varchar NOT NULL,
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "userId" integer,
                UNIQUE ("userId"),
                CONSTRAINT "FK_93e9bbd4b5c9c05cf41f683253f" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION
            )`, undefined);
        await queryRunner.query(`INSERT INTO "temporary_customer"("createdAt","updatedAt","deletedAt","title","firstName","lastName","phoneNumber","emailAddress","id","userId")
             SELECT "createdAt","updatedAt","deletedAt","title","firstName","lastName","phoneNumber","emailAddress","id","userId" FROM "customer"`, undefined);
        await queryRunner.query(`DROP TABLE "customer"`, undefined);
        await queryRunner.query(`ALTER TABLE "temporary_customer" RENAME TO "customer"`, undefined);
    }
}
exports.AddCustomerTaxId1774847000000 = AddCustomerTaxId1774847000000;
