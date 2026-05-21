-- AlterTable: adiciona turno da turma (independente do turno das salas)
ALTER TABLE "classes" ADD COLUMN "shift" VARCHAR(20);
