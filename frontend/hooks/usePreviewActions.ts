import { usePreviewErrors, type PreviewErrorsDeps } from '@/hooks/usePreviewErrors';
import { useVisualEditing, type VisualEditingDeps } from '@/hooks/useVisualEditing';

export interface PreviewActionsDeps
  extends PreviewErrorsDeps,
    Omit<VisualEditingDeps, 'submitPreviewErrorForFixRef'> {}

export function usePreviewActions(deps: PreviewActionsDeps) {
  const errorResult = usePreviewErrors(deps);
  const visualResult = useVisualEditing({
    ...deps,
    submitPreviewErrorForFixRef: errorResult.submitPreviewErrorForFixRef,
  });

  return {
    ...errorResult,
    ...visualResult,
  };
}
