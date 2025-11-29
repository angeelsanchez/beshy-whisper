-- Script extremadamente simple para solucionar el problema de RLS
-- Este script simplemente deshabilita RLS para la tabla objectives temporalmente

-- Deshabilitar RLS para la tabla objectives
ALTER TABLE public.objectives DISABLE ROW LEVEL SECURITY;

-- Verificar que RLS está deshabilitado
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'objectives'; 