-- Numera las notas que existían antes de la columna `number`, por fecha de
-- publicación: la más vieja es la #1. Los empates (misma `published_at`) se
-- desempatan por creación y después por id, para que el resultado no dependa
-- del orden en que Postgres devuelva las filas.
--
-- Los borradores entran en la misma cuenta: el número es de la nota, no de su
-- estado, y un borrador reserva el suyo.
UPDATE "logbook_entries" AS e
SET "number" = n.rn
FROM (
	SELECT "id", row_number() OVER (ORDER BY "published_at", "created_at", "id") AS rn
	FROM "logbook_entries"
) AS n
WHERE e."id" = n."id";
