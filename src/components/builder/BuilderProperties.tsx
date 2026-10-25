/**
 * BuilderProperties.tsx — panel properti kanan (T-73).
 * Satu permukaan tambah: palet muncul saat tidak ada blok terpilih.
 */
import type { KeyboardEvent } from 'react';
import type { BlockDraft } from './defaults';
import type { ThemeDraft } from './defaults';
import BlockPanel from './BlockPanel';
import QuestionElements from './QuestionElements';
import ThemePanel from './ThemePanel';

export type PropertyTab = 'block' | 'theme';

interface Props {
  formId: string;
  cloudName: string;
  selected: BlockDraft | null;
  propertyTab: PropertyTab;
  onPropertyTabChange: (tab: PropertyTab) => void;
  onClearSelection: () => void;
  onPatch: (patch: Partial<BlockDraft>) => void;
  theme: ThemeDraft;
  onThemeChange: (patch: Partial<ThemeDraft>) => void;
  onAddBlock: (block: BlockDraft, label: string) => void;
  onAddPage: () => void;
  addDisabled: boolean;
  pageDisabled: boolean;
}

const TABS: Array<{ id: PropertyTab; label: string }> = [
  { id: 'block', label: 'Blok' },
  { id: 'theme', label: 'Tema' },
];

export default function BuilderProperties({
  formId,
  cloudName,
  selected,
  propertyTab,
  onPropertyTabChange,
  onClearSelection,
  onPatch,
  theme,
  onThemeChange,
  onAddBlock,
  onAddPage,
  addDisabled,
  pageDisabled,
}: Props) {
  const handleTabKey = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    onPropertyTabChange(propertyTab === 'block' ? 'theme' : 'block');
  };

  return (
    <>
      <div className="b-pane__head">
        <h2 className="b-pane__title">Properti</h2>
        <div className="b-subtabs" role="tablist" aria-label="Panel properti">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              id={`b-property-tab-${tab.id}`}
              type="button"
              role="tab"
              className={`b-subtab${propertyTab === tab.id ? ' is-active' : ''}`}
              aria-selected={propertyTab === tab.id}
              aria-controls={`b-property-panel-${tab.id}`}
              tabIndex={propertyTab === tab.id ? 0 : -1}
              onClick={() => onPropertyTabChange(tab.id)}
              onKeyDown={handleTabKey}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div
        id="b-property-panel-block"
        className="b-pane__body"
        role="tabpanel"
        aria-labelledby="b-property-tab-block"
        tabIndex={0}
        hidden={propertyTab !== 'block'}
      >
        {selected !== null ? (
          <>
            <div className="b-inline-actions">
              <button type="button" className="b-btn b-btn--ghost b-btn--sm" onClick={onClearSelection}>
                Tambah blok
              </button>
            </div>
            <BlockPanel block={selected} onPatch={onPatch} />
          </>
        ) : (
          <QuestionElements
            onAddBlock={onAddBlock}
            onAddPage={onAddPage}
            disabled={addDisabled}
            pageDisabled={pageDisabled}
          />
        )}
      </div>

      <div
        id="b-property-panel-theme"
        className="b-pane__body"
        role="tabpanel"
        aria-labelledby="b-property-tab-theme"
        tabIndex={0}
        hidden={propertyTab !== 'theme'}
      >
        <ThemePanel
          formId={formId}
          theme={theme}
          onChange={onThemeChange}
          cloudName={cloudName}
        />
      </div>
    </>
  );
}
