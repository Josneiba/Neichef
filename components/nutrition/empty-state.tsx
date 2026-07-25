'use client'

import { EmptyState } from '@/components/ui/empty-state'
import { useT } from '@/lib/i18n'
import { FileText, ImageIcon, PenTool } from 'lucide-react'

interface NutritionEmptyStateProps {
  onAddManual: () => void
  onUploadPhoto: () => void
  onUploadFile: () => void
}

export function NutritionEmptyState({ onAddManual, onUploadPhoto, onUploadFile }: NutritionEmptyStateProps) {
  const t = useT()
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <EmptyState
        icon={ImageIcon}
        title={t('nutritionUploadPhotoTitle')}
        description={t('nutritionUploadPhotoDescription')}
        action={
          <button
            type="button"
            onClick={onUploadPhoto}
            className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
          >
            {t('nutritionUploadPhotoButton')}
          </button>
        }
      />
      <EmptyState
        icon={FileText}
        title={t('nutritionUploadFileTitle')}
        description={t('nutritionUploadFileDescription')}
        action={
          <button
            type="button"
            onClick={onUploadFile}
            className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
          >
            {t('nutritionUploadFileButton')}
          </button>
        }
      />
      <EmptyState
        icon={PenTool}
        title={t('nutritionAddManualTitle')}
        description={t('nutritionAddManualDescription')}
        action={
          <button
            type="button"
            onClick={onAddManual}
            className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
          >
            {t('nutritionAddManualButton')}
          </button>
        }
      />
    </div>
  )
}
