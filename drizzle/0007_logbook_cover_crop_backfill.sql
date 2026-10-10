-- El encuadre nuevo parte del foco que ya tenía cada nota: "arriba" muestra el
-- borde de arriba de la foto (y = 0), "abajo" el de abajo (y = 1) y "centro" el
-- medio, que es lo que ya pone el default. A lo ancho, centrado y sin zoom,
-- igual que se veía con `object-position`.
UPDATE "logbook_entries"
SET "cover_crop_y" = CASE "cover_focus"
	WHEN 'top' THEN 0
	WHEN 'bottom' THEN 1
	ELSE 0.5
END;
