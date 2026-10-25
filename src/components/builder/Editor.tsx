/**
 * Editor.tsx — pemilik state dan efek builder (T-73). client:load.
 * Topbar, pesan, dan workspace hanya presentational; riwayat, autosave, dan
 * pratinjau valid terakhir berada di hook terpisah.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { LIMITS } from '../../lib/config/limits';
import type { BlockDraft, BuilderState, ThemeDraft } from './defaults';
import { insertBlockAfter, moveBlock, questionCount, removeBlock, updateBlock } from './state';
import { appendNewPage } from './pages';
import { blockIndexFromIssuePath } from './blockLabels';
import { payloadBlockIdAt } from './serialize';
import { sensitiveQuestionIds } from './sensitive';
import BuilderTopbar from './BuilderTopbar';
import BuilderMessages, { type BuilderNotice } from './BuilderMessages';
import BuilderWorkspace, { type WorkspaceTab } from './BuilderWorkspace';
import type { PropertyTab } from './BuilderProperties';
import { useBuilderState } from './useBuilderState';
import { useAutosave } from './useAutosave';
import { useBuilderPreview } from './useBuilderPreview';

interface Props {
  formId: string;
  slug: string;
  status: string;
  version: number;
  initial: BuilderState;
  cloudName: string;
}

export default function Editor({ formId, slug, status, version, initial, cloudName }: Props) {
  const builder = useBuilderState(initial);
  const { state, stateRef } = builder;
  const preview = useBuilderPreview(state);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  // T-77: id blok terakhir yang dipilih — dipakai sebagai jangkar penyisipan
  // saat palet dipakai tanpa seleksi aktif (mis. setelah clear selection).
  const lastSelectedIdRef = useRef<string | null>(null);
  const [mobileTab, setMobileTab] = useState<WorkspaceTab>('structure');
  const [propertyTab, setPropertyTab] = useState<PropertyTab>('block');
  const [notice, setNotice] = useState<BuilderNotice | null>(null);
  const [currentStatus, setCurrentStatus] = useState(status);
  const [currentVersion, setCurrentVersion] = useState(version);

  const handlePublished = useCallback((nextVersion: number) => {
    setCurrentVersion(nextVersion);
    setCurrentStatus('published');
  }, []);

  const autosave = useAutosave({
    formId,
    slug,
    state,
    stateRef,
    version,
    setIssues: builder.setIssues,
    setNotice,
    onPublished: handlePublished,
  });

  useEffect(() => {
    if (notice === null) return;
    const timer = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    lastSelectedIdRef.current = selectedId;
  }, [selectedId]);

  useEffect(() => {
    if (selectedId === null) return;
    if (!state.blocks.some((block) => block.id === selectedId)) setSelectedId(null);
  }, [state.blocks, selectedId]);

  const selected = state.blocks.find((block) => block.id === selectedId) ?? null;
  const sensitiveSet = new Set(sensitiveQuestionIds(state.blocks));
  const sensitiveBlocks = state.blocks.filter((block) => sensitiveSet.has(block.id));

  const handleTitleChange = (title: string) => {
    builder.apply({ ...stateRef.current, title });
  };

  const handleAddBlock = (block: BlockDraft, label: string) => {
    const current = stateRef.current;
    if (current.blocks.length >= LIMITS.maxBlocksPerForm) {
      setNotice({ message: `Batas ${LIMITS.maxBlocksPerForm} blok per form sudah tercapai.` });
      return;
    }
    if (block.type === 'question' && questionCount(current.blocks) >= LIMITS.maxQuestionsPerForm) {
      setNotice({ message: `Batas ${LIMITS.maxQuestionsPerForm} pertanyaan per form sudah tercapai.` });
      return;
    }
    // T-77: sisip setelah blok yang sedang (atau terakhir) dipilih;
    // jangkar tak ada lagi di blocks → append di akhir seperti perilaku lama.
    const anchor = selectedId ?? lastSelectedIdRef.current;
    const afterId = anchor !== null && current.blocks.some((b) => b.id === anchor) ? anchor : null;
    builder.apply({ ...current, blocks: insertBlockAfter(current.blocks, afterId, block) });
    setSelectedId(block.id);
    setPropertyTab('block');
    setNotice({ message: `Blok "${label}" ditambahkan.` });
  };

  const handleAddPage = () => {
    const current = stateRef.current;
    if (current.blocks.length + 2 > LIMITS.maxBlocksPerForm) {
      setNotice({ message: `Batas ${LIMITS.maxBlocksPerForm} blok per form sudah tercapai.` });
      return;
    }
    const { blocks, headingId } = appendNewPage(current.blocks, 'Bagian Baru');
    builder.apply({ ...current, blocks });
    setSelectedId(headingId);
    setPropertyTab('block');
    setNotice({ message: 'Halaman baru ditambahkan.' });
  };

  const handleSelect = (id: string) => {
    setSelectedId(id);
    setPropertyTab('block');
    setMobileTab('properties');
  };

  const handleClearSelection = () => {
    setSelectedId(null);
    setPropertyTab('block');
  };

  const handleMove = (id: string, delta: -1 | 1) => {
    builder.apply(moveBlock(stateRef.current, id, delta));
  };

  const handleRemove = (id: string) => {
    builder.apply(removeBlock(stateRef.current, id));
    if (selectedId === id) setSelectedId(null);
  };

  const handlePatch = (patch: Partial<BlockDraft>) => {
    if (selected === null) return;
    builder.apply(updateBlock(stateRef.current, selected.id, patch));
  };

  const handleThemeChange = (patch: Partial<ThemeDraft>) => {
    const current = stateRef.current;
    builder.apply({ ...current, theme: { ...current.theme, ...patch } });
  };

  const focusIssue = (path: string) => {
    if (path.startsWith('theme')) {
      setSelectedId(null);
      setPropertyTab('theme');
      setMobileTab('properties');
      return;
    }
    const index = blockIndexFromIssuePath(path);
    const id = index === null ? null : payloadBlockIdAt(stateRef.current.blocks, index);
    if (id !== null) {
      setSelectedId(id);
      setPropertyTab('block');
    }
    setMobileTab('properties');
  };

  const focusSensitive = (id: string) => {
    setSelectedId(id);
    setPropertyTab('block');
    setMobileTab('properties');
  };

  return (
    <div className="b-editor">
      <BuilderTopbar
        title={state.title}
        status={currentStatus}
        version={currentVersion}
        saveState={autosave.saveState}
        canUndo={builder.canUndo}
        canRedo={builder.canRedo}
        onTitleChange={handleTitleChange}
        onUndo={builder.undo}
        onRedo={builder.redo}
        onPublish={autosave.publish}
        formId={formId}
        slug={slug}
      />

      <BuilderMessages
        issues={builder.issues}
        saveError={autosave.saveError}
        sensitiveBlocks={sensitiveBlocks}
        notice={notice}
        onDismissError={autosave.dismissError}
        onDismissNotice={() => setNotice(null)}
        onIssueSelect={focusIssue}
        onSensitiveSelect={focusSensitive}
      />

      <BuilderWorkspace
        formId={formId}
        state={state}
        selected={selected}
        selectedId={selectedId}
        cloudName={cloudName}
        previewForm={preview.form}
        previewInvalid={preview.invalid}
        mobileTab={mobileTab}
        onMobileTabChange={setMobileTab}
        onSelect={handleSelect}
        onMove={handleMove}
        onRemove={handleRemove}
        propertyTab={propertyTab}
        onPropertyTabChange={setPropertyTab}
        onClearSelection={handleClearSelection}
        onPatch={handlePatch}
        onThemeChange={handleThemeChange}
        onAddBlock={handleAddBlock}
        onAddPage={handleAddPage}
        addDisabled={state.blocks.length >= LIMITS.maxBlocksPerForm}
        pageDisabled={state.blocks.length + 2 > LIMITS.maxBlocksPerForm}
      />
    </div>
  );
}
