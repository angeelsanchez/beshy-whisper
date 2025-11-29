-- Añadir columna is_private a la tabla entries
ALTER TABLE public.entries
ADD COLUMN is_private boolean DEFAULT false;

-- Actualizar la política RLS para tener en cuenta los posts privados
CREATE OR REPLACE POLICY "Los posts públicos son visibles para todos, los privados solo para su autor" 
ON public.entries 
FOR SELECT 
USING (
  (auth.uid() = user_id) -- El autor siempre puede ver sus propios posts
  OR 
  (is_private = false)   -- Los posts públicos son visibles para todos
);

-- Actualizar comentario
COMMENT ON TABLE public.entries IS 'Tabla para almacenar los posts de los usuarios. Los posts pueden ser públicos o privados.'; 