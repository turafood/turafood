-- ============================================================
-- TURAFOOD — GALERÍA DE FOTOS DEL PRODUCTO
--
-- Antes solo cabía una foto, y como texto libre (`image_url`), lo que
-- obligaba al negocio a conseguir la imagen en otro lado y pegar un
-- enlace. Ahora sube los archivos desde su computador o su celular.
--
-- `image_url` se conserva como la foto principal: es lo que ya leen la
-- app de cliente y el resto de pantallas. `images` guarda la galería
-- completa, y la primera de esa lista es siempre la principal.
-- ============================================================

ALTER TABLE public.products
    ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}';

COMMENT ON COLUMN public.products.images IS
    'Galería del producto. La primera es la principal y se copia a image_url.';

/**
 * Mantiene `image_url` sincronizada con la primera de la galería.
 * Así nada de lo que ya existe tiene que cambiar para seguir viendo
 * la foto correcta.
 */
CREATE OR REPLACE FUNCTION public.sync_product_cover()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.images IS NOT NULL AND array_length(NEW.images, 1) > 0 THEN
        NEW.image_url := NEW.images[1];
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS products_sync_cover ON public.products;
CREATE TRIGGER products_sync_cover
    BEFORE INSERT OR UPDATE OF images ON public.products
    FOR EACH ROW EXECUTE FUNCTION public.sync_product_cover();

-- Lo que ya tenía foto arranca con ella dentro de la galería
UPDATE public.products
   SET images = ARRAY[image_url]
 WHERE image_url IS NOT NULL
   AND btrim(image_url) <> ''
   AND (images IS NULL OR array_length(images, 1) IS NULL);


-- ------------------------------------------------------------
-- BUCKET DE FOTOS
--
-- Este sí es público en lectura: son las fotos del menú, tienen que
-- verse en la app de cliente sin sesión. Escribir sigue siendo solo
-- del dueño, y la ruta empieza por su id para que nadie pueda
-- sobrescribir la carpeta de otro.
-- ------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'product-photos', 'product-photos', true, 5242880,
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
ON CONFLICT (id) DO UPDATE
    SET public = true,
        file_size_limit = 5242880,
        allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif'];

DROP POLICY IF EXISTS "fotos de producto: ver" ON storage.objects;
CREATE POLICY "fotos de producto: ver" ON storage.objects
    FOR SELECT USING (bucket_id = 'product-photos');

DROP POLICY IF EXISTS "fotos de producto: subir" ON storage.objects;
CREATE POLICY "fotos de producto: subir" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'product-photos'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

DROP POLICY IF EXISTS "fotos de producto: reemplazar" ON storage.objects;
CREATE POLICY "fotos de producto: reemplazar" ON storage.objects
    FOR UPDATE TO authenticated
    USING (
        bucket_id = 'product-photos'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

DROP POLICY IF EXISTS "fotos de producto: borrar" ON storage.objects;
CREATE POLICY "fotos de producto: borrar" ON storage.objects
    FOR DELETE TO authenticated
    USING (
        bucket_id = 'product-photos'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
