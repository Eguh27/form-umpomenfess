/**
 * BuilderWorkspace.tsx — tiga panel desktop dan segmented mobile (T-73).
 * State tetap di Editor; komponen ini hanya menyusun struktur, kanvas, properti.
 */
import type { KeyboardEvent } from 'react';
import type { BlockDraft, BuilderState } from './defaults';
import { LIMITS } from '../../lib/config/limits';
import { countPages } from './pages';
import type { FormSchemaData } from '../../lib/forms/schema';
import BlockList from './BlockList';
import PreviewPane from './PreviewPane';
import BuilderProperties, { type PropertyTab } from './BuilderProperties';
import type { ThemeDraft } from './defaults';

export type WorkspaceTab = 'structure' | 'preview' | 'properties';

interface Props {
  formId: string;
  state: BuilderState;
  selected: BlockDraft | null;
  selectedId: string | null;
  cloudName: string;
  previewForm: FormSchemaData | null;
  previewInvalid: boolean;
  mobileTab: WorkspaceTab;
  onMobileTabChange: (tab: WorkspaceTab) => void;
  onSelect: (id: string) => void;
  onMove: (id: string, delta: -1 | 1) => void;
  onRemove: (id: string) => void;
  propertyTab: PropertyTab;
  onPropertyTabChange: (tab: PropertyTab) => void;
  onClearSelection: () => void;
  onPatch: (patch: Partial<BlockDraft>) => void;
  onThemeChange: (patch: Partial<ThemeDraft>) => void;
  onAddBlock: (block: BlockDraft, label: string) => void;
  onAddPage: () => void;
  addDisabled: boolean;
  pageDisabled: boolean;
}

const MOBILE_TABS: Array<{ id: WorkspaceTab; label: string }> = [
  { id: 'structure', label: 'Struktur' },
  { id: 'preview', label: 'Pratinjau' },
  { id: 'properties', label: 'Properti' },
];

export default function BuilderWorkspace({
  formId,
  state,
  selected,
  selectedId,
  cloudName,
  previewForm,
  previewInvalid,
  mobileTab,
  onMobileTabChange,
  onSelect,
  onMove,
  onRemove,
  propertyTab,
  onPropertyTabChange,
  onClearSelection,
  onPatch,
  onThemeChange,
  onAddBlock,
  onAddPage,
  addDisabled,
  pageDisabled,
}: Props) {
  const handleTabKey = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const index = MOBILE_TABS.findIndex((tab) => tab.id === mobileTab);
    const nextIndex = event.key === 'ArrowRight'
      ? (index + 1) % MOBILE_TABS.length
      : (index - 1 + MOBILE_TABS.length) % MOBILE_TABS.length;
    onMobileTabChange(MOBILE_TABS[nextIndex].id);
  };

  const paneClass = (tab: WorkspaceTab, extra: string) =>
    `b-pane ${extra}${mobileTab === tab ? ' is-mobile-active' : ''}`;

  return (
    <>
      <div className="b-mobiletabs" role="tablist" aria-label="Panel builder">
        {MOBILE_TABS.map((tab) => (
          <button
            key={tab.id}
            id={`b-workspace-tab-${tab.id}`}
            type="button"
            role="tab"
            className={`b-mobiletab${mobileTab === tab.id ? ' is-active' : ''}`}
            aria-selected={mobileTab === tab.id}
            aria-controls={`b-workspace-panel-${tab.id}`}
            tabIndex={mobileTab === tab.id ? 0 : -1}
            onClick={() => onMobileTabChange(tab.id)}
            onKeyDown={handleTabKey}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="b-workspace">
        <section
          id="b-workspace-panel-structure"
          className={paneClass('structure', 'b-pane--structure')}
          role="tabpanel"
          aria-labelledby="b-workspace-tab-structure"
          tabIndex={0}
        >
          <div className="b-pane__head">
            <h2 className="b-pane__title">Struktur</h2>
            <span className="b-pane__count">
              {state.blocks.length}/{LIMITS.maxBlocksPerForm} · {countPages(state.blocks)} halaman
            </span>
          </div>
          <div className="b-pane__body">
            <BlockList
              state={state}
              selectedId={selectedId}
              onSelect={onSelect}
              onMove={onMove}
              onRemove={onRemove}
            />
          </div>
        </section>

        <section
          id="b-workspace-panel-preview"
          className={paneClass('preview', 'b-pane--canvas')}
          role="tabpanel"
          aria-labelledby="b-workspace-tab-preview"
          tabIndex={0}
        >
          <PreviewPane form={previewForm} cloudName={cloudName} invalid={previewInvalid} />
        </section>

        <section
          id="b-workspace-panel-properties"
          className={paneClass('properties', 'b-pane--properties')}
          role="tabpanel"
          aria-labelledby="b-workspace-tab-properties"
          tabIndex={0}
        >
          <BuilderProperties
            formId={formId}
            cloudName={cloudName}
            selected={selected}
            propertyTab={propertyTab}
            onPropertyTabChange={onPropertyTabChange}
            onClearSelection={onClearSelection}
            onPatch={onPatch}
            theme={state.theme}
            onThemeChange={onThemeChange}
            onAddBlock={onAddBlock}
            onAddPage={onAddPage}
            addDisabled={addDisabled}
            pageDisabled={pageDisabled}
          />
        </section>
      </div>
    </>
  );
}
