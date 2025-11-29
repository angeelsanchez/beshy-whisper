-- Script para corregir las políticas RLS de la tabla likes
-- Este script permite que los usuarios puedan dar like a sus propios posts

-- Verificar las políticas actuales
SELECT tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'likes';

-- Eliminar las políticas existentes
DROP POLICY IF EXISTS "Cualquiera puede leer likes" ON public.likes;
DROP POLICY IF EXISTS "Usuarios autenticados pueden insertar sus propios likes" ON public.likes;
DROP POLICY IF EXISTS "Usuarios pueden eliminar sus propios likes" ON public.likes;

-- Crear políticas más permisivas
-- Política para permitir que cualquiera pueda leer los likes
CREATE POLICY "Cualquiera puede leer likes" 
  ON public.likes FOR SELECT 
  USING (true);

-- Política para permitir que los usuarios autenticados inserten likes
-- Esta política es más permisiva y no restringe a qué posts pueden dar like
CREATE POLICY "Usuarios autenticados pueden insertar likes" 
  ON public.likes FOR INSERT 
  WITH CHECK (auth.uid()::text = user_id::text);

-- Política para permitir que los usuarios eliminen sus propios likes
CREATE POLICY "Usuarios pueden eliminar sus propios likes" 
  ON public.likes FOR DELETE 
  USING (auth.uid()::text = user_id::text);

-- Verificar que las políticas se han creado correctamente
SELECT tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'likes'; 