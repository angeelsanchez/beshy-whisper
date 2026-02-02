'use client';

import { useState, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useTheme } from '@/context/ThemeContext';
import Avatar from './Avatar';
import { compressAvatar } from '@/utils/image-compress';

interface ProfileEditFormProps {
  currentPhotoUrl?: string | null;
  currentBio?: string | null;
  userName?: string | null;
  onUpdate: (fields: { profile_photo_url?: string | null; bio?: string | null }) => void;
}

const BIO_MAX = 160;

export default function ProfileEditForm({
  currentPhotoUrl,
  currentBio,
  userName,
  onUpdate,
}: ProfileEditFormProps) {
  const { isDay } = useTheme();
  const { update: updateSession } = useSession();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [bio, setBio] = useState(currentBio || '');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [savingBio, setSavingBio] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const bioChanged = bio !== (currentBio || '');

  const clearMessages = useCallback(() => {
    setError(null);
    setSuccess(null);
  }, []);

  const handlePhotoSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    clearMessages();
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Selecciona un archivo de imagen válido');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('La imagen es demasiado grande (máx 10MB antes de comprimir)');
      return;
    }

    setUploading(true);
    try {
      const compressed = await compressAvatar(file);
      const previewUrl = URL.createObjectURL(compressed);
      setPhotoPreview(previewUrl);

      const formData = new FormData();
      formData.append('photo', compressed, 'avatar.webp');

      const res = await fetch('/api/user/update-photo', {
        method: 'POST',
        body: formData,
      });

      const data: { profile_photo_url?: string; error?: string } = await res.json();

      if (!res.ok) {
        setError(data.error || 'Error al subir la foto');
        setPhotoPreview(null);
        return;
      }

      if (data.profile_photo_url) {
        await updateSession({ profile_photo_url: data.profile_photo_url });
        onUpdate({ profile_photo_url: data.profile_photo_url });
        setSuccess('Foto actualizada');
      }
    } catch {
      setError('Error al procesar la imagen');
      setPhotoPreview(null);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [clearMessages, updateSession, onUpdate]);

  const handleDeletePhoto = useCallback(async () => {
    clearMessages();
    setUploading(true);
    try {
      const res = await fetch('/api/user/delete-photo', { method: 'DELETE' });
      const data: { error?: string } = await res.json();

      if (!res.ok) {
        setError(data.error || 'Error al eliminar la foto');
        return;
      }

      setPhotoPreview(null);
      await updateSession({ profile_photo_url: null });
      onUpdate({ profile_photo_url: null });
      setSuccess('Foto eliminada');
    } catch {
      setError('Error al eliminar la foto');
    } finally {
      setUploading(false);
    }
  }, [clearMessages, updateSession, onUpdate]);

  const handleSaveBio = useCallback(async () => {
    clearMessages();
    if (bio.length > BIO_MAX) {
      setError(`La bio no puede superar ${BIO_MAX} caracteres`);
      return;
    }

    setSavingBio(true);
    try {
      const res = await fetch('/api/user/update-bio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bio }),
      });

      const data: { bio?: string | null; error?: string } = await res.json();

      if (!res.ok) {
        setError(data.error || 'Error al guardar la bio');
        return;
      }

      await updateSession({ bio: data.bio ?? null });
      onUpdate({ bio: data.bio ?? null });
      setSuccess('Bio actualizada');
    } catch {
      setError('Error al guardar la bio');
    } finally {
      setSavingBio(false);
    }
  }, [bio, clearMessages, updateSession, onUpdate]);

  const displayPhoto = photoPreview || currentPhotoUrl;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="relative group cursor-pointer"
          aria-label="Cambiar foto de perfil"
        >
          <Avatar src={displayPhoto} name={userName} size="lg" />
          <div className={`absolute inset-0 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity ${
            isDay ? 'bg-[#4A2E1B]/50' : 'bg-[#F5F0E1]/30'
          }`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="white" viewBox="0 0 16 16">
              <path d="M10.5 8.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z"/>
              <path d="M2 4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-1.172a2 2 0 0 1-1.414-.586l-.828-.828A2 2 0 0 0 9.172 2H6.828a2 2 0 0 0-1.414.586l-.828.828A2 2 0 0 1 3.172 4H2zm.5 2a.5.5 0 1 1 0-1 .5.5 0 0 1 0 1zm9 2.5a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0z"/>
            </svg>
          </div>
          {uploading && (
            <div className="absolute inset-0 rounded-full flex items-center justify-center bg-black/40">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handlePhotoSelect}
          className="hidden"
        />

        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className={`text-sm font-medium ${
              isDay ? 'text-[#4A2E1B]' : 'text-[#F5F0E1]'
            } hover:underline disabled:opacity-50`}
          >
            Cambiar foto
          </button>
          {(currentPhotoUrl || photoPreview) && (
            <button
              type="button"
              onClick={handleDeletePhoto}
              disabled={uploading}
              className="text-sm text-red-500 hover:underline disabled:opacity-50 text-left"
            >
              Eliminar foto
            </button>
          )}
        </div>
      </div>

      <div>
        <label
          htmlFor="bio-input"
          className={`block text-sm font-medium mb-1 ${
            isDay ? 'text-[#4A2E1B]' : 'text-[#F5F0E1]'
          }`}
        >
          Bio
        </label>
        <textarea
          id="bio-input"
          value={bio}
          onChange={(e) => {
            clearMessages();
            setBio(e.target.value);
          }}
          maxLength={BIO_MAX}
          rows={3}
          placeholder="Cuéntanos algo sobre ti..."
          className={`w-full rounded-lg px-3 py-2 text-sm resize-none border transition-colors ${
            isDay
              ? 'bg-white border-[#4A2E1B]/20 text-[#4A2E1B] placeholder-[#8A7B6C] focus:border-[#4A2E1B]/50'
              : 'bg-[#382723] border-[#F5F0E1]/20 text-[#F5F0E1] placeholder-[#8A7B6C] focus:border-[#F5F0E1]/50'
          } focus:outline-none`}
        />
        <div className="flex items-center justify-between mt-1">
          <span className={`text-xs ${
            bio.length > BIO_MAX ? 'text-red-500' : 'text-[#8A7B6C]'
          }`}>
            {bio.length}/{BIO_MAX}
          </span>
          {bioChanged && (
            <button
              type="button"
              onClick={handleSaveBio}
              disabled={savingBio || bio.length > BIO_MAX}
              className={`text-sm font-medium px-3 py-1 rounded-lg transition-colors disabled:opacity-50 ${
                isDay
                  ? 'bg-[#4A2E1B] text-[#F5F0E1] hover:bg-[#3A1E0B]'
                  : 'bg-[#F5F0E1] text-[#4A2E1B] hover:bg-[#E5E0D1]'
              }`}
            >
              {savingBio ? 'Guardando...' : 'Guardar'}
            </button>
          )}
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}
      {success && (
        <p className={`text-sm ${isDay ? 'text-green-700' : 'text-green-400'}`}>{success}</p>
      )}
    </div>
  );
}
