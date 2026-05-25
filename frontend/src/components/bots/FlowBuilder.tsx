import { useState } from 'react';
import { Plus, Trash2, Star, ChevronDown, ChevronUp, Save, Eye } from 'lucide-react';
import TelegramPreview from './TelegramPreview';

interface BotAction {
  type: 'GO_TO_STEP' | 'LINK_TO_PRODUCT' | 'MAIN_MENU' | 'SHOW_PROFILE';
  payload?: string;
}

interface BotButton {
  id: string;
  text: string;
  action: BotAction;
}

interface BotStep {
  id: string;
  name: string;
  message: string;
  buttons: BotButton[];
}

interface BotFlow {
  id: string;
  name: string;
  trigger: string;
  startStepId: string | null;
  steps: BotStep[];
}

interface Product {
  id: string;
  name: string;
}

interface FlowBuilderProps {
  flows: BotFlow[];
  onChange: (flows: BotFlow[]) => void;
  onSave: (flows: BotFlow[]) => void;
  products: Product[];
  saving: boolean;
}

const uid = () => Math.random().toString(36).substring(2, 15) + Date.now().toString(36);

import { useLanguage } from '../../hooks/useLanguage';

export default function FlowBuilder({ flows, onChange, onSave, products, saving }: FlowBuilderProps) {
  const { t } = useLanguage();
  
  const createDefaultFlow = (index: number): BotFlow => {
    const stepId = uid();
    return {
      id: uid(),
      name: index === 0 ? t('botsPage.flow.mainFlow') : `${t('botsPage.flow.newFlow')} ${index + 1}`,
      trigger: index === 0 ? '/start' : `/fluxo${index + 1}`,
      startStepId: stepId,
      steps: [{
        id: stepId,
        name: t('botsPage.flow.welcomeMsg'),
        message: 'Olá, {userName}! 👋 Bem-vindo(a) ao nosso bot.',
        buttons: [],
      }],
    };
  };

  const [activeFlowIndex, setActiveFlowIndex] = useState(0);
  const [expandedSteps, setExpandedSteps] = useState<Record<string, boolean>>({});
  const [previewStep, setPreviewStep] = useState<BotStep | null>(null);

  const addFlow = () => {
    const newFlow = createDefaultFlow(flows.length);
    onChange([...flows, newFlow]);
    setActiveFlowIndex(flows.length);
  };

  const removeFlow = (index: number) => {
    if (flows.length <= 1) return;
    const updated = flows.filter((_, i) => i !== index);
    onChange(updated);
    setActiveFlowIndex(Math.max(0, index - 1));
  };

  const updateFlow = (index: number, partial: Partial<BotFlow>) => {
    const updated = [...flows];
    updated[index] = { ...updated[index], ...partial };
    onChange(updated);
  };

  const addStep = (flowIndex: number) => {
    const flow = flows[flowIndex];
    const newStep: BotStep = {
      id: uid(),
      name: `${t('botsPage.flow.steps')} ${flow.steps.length + 1}`,
      message: t('botsPage.flow.emptyMsg'),
      buttons: [],
    };
    const updatedSteps = [...flow.steps, newStep];
    updateFlow(flowIndex, { steps: updatedSteps });
    setExpandedSteps({ ...expandedSteps, [newStep.id]: true });
    setPreviewStep(newStep);
  };

  const removeStep = (flowIndex: number, stepIndex: number) => {
    const flow = flows[flowIndex];
    const updatedSteps = flow.steps.filter((_, i) => i !== stepIndex);
    const partial: Partial<BotFlow> = { steps: updatedSteps };
    if (flow.startStepId === flow.steps[stepIndex].id && updatedSteps.length > 0) {
      partial.startStepId = updatedSteps[0].id;
    }
    updateFlow(flowIndex, partial);
    if (previewStep?.id === flow.steps[stepIndex].id) {
      setPreviewStep(updatedSteps[0] || null);
    }
  };

  const updateStep = (flowIndex: number, stepIndex: number, partial: Partial<BotStep>) => {
    const flow = flows[flowIndex];
    const updatedSteps = [...flow.steps];
    updatedSteps[stepIndex] = { ...updatedSteps[stepIndex], ...partial };
    updateFlow(flowIndex, { steps: updatedSteps });
    if (previewStep?.id === flow.steps[stepIndex].id) {
      setPreviewStep(updatedSteps[stepIndex]);
    }
  };

  const addButton = (flowIndex: number, stepIndex: number) => {
    const step = flows[flowIndex].steps[stepIndex];
    const newBtn: BotButton = { id: uid(), text: t('botsPage.flow.button'), action: { type: 'GO_TO_STEP', payload: '' } };
    updateStep(flowIndex, stepIndex, { buttons: [...step.buttons, newBtn] });
  };

  const removeButton = (flowIndex: number, stepIndex: number, btnIndex: number) => {
    const step = flows[flowIndex].steps[stepIndex];
    updateStep(flowIndex, stepIndex, { buttons: step.buttons.filter((_, i) => i !== btnIndex) });
  };

  const updateButton = (flowIndex: number, stepIndex: number, btnIndex: number, partial: Partial<BotButton>) => {
    const step = flows[flowIndex].steps[stepIndex];
    const updatedBtns = [...step.buttons];
    if (partial.action) {
      updatedBtns[btnIndex] = { ...updatedBtns[btnIndex], ...partial, action: { ...updatedBtns[btnIndex].action, ...partial.action } };
    } else {
      updatedBtns[btnIndex] = { ...updatedBtns[btnIndex], ...partial };
    }
    updateStep(flowIndex, stepIndex, { buttons: updatedBtns });
  };

  const toggleStep = (step: BotStep) => {
    const isOpen = expandedSteps[step.id];
    setExpandedSteps({ ...expandedSteps, [step.id]: !isOpen });
    if (!isOpen) setPreviewStep(step);
  };

  const activeFlow = flows[activeFlowIndex] || null;
  const livePreviewStep = previewStep
    ? (activeFlow?.steps.find(s => s.id === previewStep.id) || previewStep)
    : (activeFlow?.steps?.[0] || null);

  return (
    <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>{t('botsPage.flow.builderTitle')}</h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
              {t('botsPage.flow.builderDesc')}
            </p>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => addFlow()}>
            <Plus size={14} /> {t('botsPage.flow.addFlow')}
          </button>
        </div>

        {flows.length > 1 && (
          <div className="tabs-bar" style={{ marginBottom: 16 }}>
            {flows.map((flow, i) => (
              <button
                key={flow.id}
                type="button"
                className={`tab-btn ${activeFlowIndex === i ? 'active' : ''}`}
                onClick={() => setActiveFlowIndex(i)}
              >
                {flow.name || `${t('botsPage.flow.newFlow')} ${i + 1}`}
              </button>
            ))}
          </div>
        )}

        {activeFlow && (
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>{t('botsPage.flow.flowSettings')}</span>
              {flows.length > 1 && activeFlow.trigger !== '/start' && (
                <button type="button" className="btn btn-danger btn-sm" onClick={() => removeFlow(activeFlowIndex)}>
                  <Trash2 size={14} /> {t('botsPage.flow.remove')}
                </button>
              )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div className="form-group">
                <label>{t('botsPage.flow.flowName')}</label>
                <input
                  className="input"
                  value={activeFlow.name}
                  onChange={(e) => updateFlow(activeFlowIndex, { name: e.target.value })}
                  placeholder={t('botsPage.flow.flowNamePlaceholder')}
                />
              </div>
              <div className="form-group">
                <label>{t('botsPage.flow.trigger')}</label>
                <input
                  className="input"
                  value={activeFlow.trigger}
                  onChange={(e) => updateFlow(activeFlowIndex, { trigger: e.target.value })}
                  placeholder={t('botsPage.flow.triggerPlaceholder')}
                  disabled={activeFlow.trigger === '/start'}
                />
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: 14, fontWeight: 600 }}>{t('botsPage.flow.steps')} ({activeFlow.steps.length})</span>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => addStep(activeFlowIndex)}>
                  <Plus size={14} /> {t('botsPage.flow.addStep')}
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {activeFlow.steps.map((step, stepIndex) => {
                  const isStart = activeFlow.trigger === '/start' && stepIndex === 0;
                  const isExpanded = expandedSteps[step.id];
                  const isPreviewActive = livePreviewStep?.id === step.id;
                  return (
                    <div key={step.id} style={{
                      background: 'var(--bg-secondary)',
                      border: `1px solid ${isStart ? 'var(--accent)' : isPreviewActive ? 'rgba(124,58,237,0.4)' : 'var(--border)'}`,
                      borderRadius: 'var(--radius-sm)',
                      padding: 12,
                      transition: 'border-color 0.2s',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                        onClick={() => toggleStep(step)}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontWeight: 600, fontSize: 14 }}>{step.name}</span>
                          {isStart && <span className="badge badge-success" style={{ fontSize: 11 }}>{t('botsPage.flow.initial')}</span>}
                          {isPreviewActive && !isStart && <span className="badge" style={{ fontSize: 11, background: 'rgba(124,58,237,0.2)', color: 'var(--accent)' }}>{t('botsPage.flow.preview')}</span>}
                        </div>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <button type="button" className="btn btn-ghost btn-sm"
                            onClick={(e) => { e.stopPropagation(); setPreviewStep(step); }}
                            style={{ padding: '4px 8px', fontSize: 11, color: isPreviewActive ? 'var(--accent)' : undefined }}>
                            <Eye size={12} />
                          </button>
                          {!isStart && (
                            <button type="button" className="btn btn-danger btn-sm"
                              onClick={(e) => { e.stopPropagation(); removeStep(activeFlowIndex, stepIndex); }}
                              style={{ padding: '4px 8px' }}>
                              <Trash2 size={12} />
                            </button>
                          )}
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </div>
                      </div>

                      {isExpanded && (
                        <div style={{ marginTop: 12 }}>
                          <div className="form-group">
                            <label>{t('botsPage.flow.stepName')}</label>
                            <input className="input" value={step.name}
                              onChange={(e) => updateStep(activeFlowIndex, stepIndex, { name: e.target.value })} />
                          </div>
                          <div className="form-group">
                            <label>{t('botsPage.flow.message')}</label>
                            <textarea className="input" rows={4} value={step.message}
                              style={{ resize: 'vertical' }}
                              onChange={(e) => updateStep(activeFlowIndex, stepIndex, { message: e.target.value })} />
                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                              {t('botsPage.flow.messageHint')}
                            </span>
                          </div>

                          <div style={{ marginTop: 12 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                              <span style={{ fontSize: 13, fontWeight: 600 }}>{t('botsPage.flow.buttons')} ({step.buttons.length})</span>
                              <button type="button" className="btn btn-ghost btn-sm"
                                onClick={() => addButton(activeFlowIndex, stepIndex)} style={{ fontSize: 12 }}>
                                <Plus size={12} /> {t('botsPage.flow.button')}
                              </button>
                            </div>
                            {step.buttons.map((btn, btnIndex) => (
                              <div key={btn.id} style={{
                                background: 'var(--bg-card)',
                                border: '1px solid var(--border)',
                                borderRadius: 'var(--radius-sm)',
                                padding: 10,
                                marginBottom: 8,
                              }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8, alignItems: 'end' }}>
                                  <div className="form-group" style={{ margin: 0 }}>
                                    <label style={{ fontSize: 11 }}>{t('botsPage.flow.text')}</label>
                                    <input className="input" value={btn.text}
                                      onChange={(e) => updateButton(activeFlowIndex, stepIndex, btnIndex, { text: e.target.value })}
                                      style={{ padding: '8px 10px', fontSize: 13 }} />
                                  </div>
                                  <div className="form-group" style={{ margin: 0 }}>
                                    <label style={{ fontSize: 11 }}>{t('botsPage.flow.action')}</label>
                                    <select className="input" value={btn.action.type}
                                      onChange={(e) => updateButton(activeFlowIndex, stepIndex, btnIndex, {
                                        action: { type: e.target.value as BotAction['type'], payload: '' },
                                      })}
                                      style={{ padding: '8px 10px', fontSize: 13 }}>
                                      <option value="GO_TO_STEP">{t('botsPage.flow.goToStep')}</option>
                                      <option value="LINK_TO_PRODUCT">{t('botsPage.flow.linkToProduct')}</option>
                                      <option value="MAIN_MENU">{t('botsPage.flow.mainMenu')}</option>
                                      <option value="SHOW_PROFILE">{t('botsPage.flow.showProfile')}</option>
                                    </select>
                                  </div>
                                  <button type="button" className="btn btn-danger btn-sm"
                                    onClick={() => removeButton(activeFlowIndex, stepIndex, btnIndex)}
                                    style={{ padding: '8px', marginBottom: 0 }}>
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                                {btn.action.type === 'GO_TO_STEP' && (
                                  <div className="form-group" style={{ margin: '8px 0 0' }}>
                                    <label style={{ fontSize: 11 }}>{t('botsPage.flow.destStep')}</label>
                                    <select className="input" value={btn.action.payload || ''}
                                      onChange={(e) => updateButton(activeFlowIndex, stepIndex, btnIndex, {
                                        action: { ...btn.action, payload: e.target.value },
                                      })}
                                      style={{ padding: '8px 10px', fontSize: 13 }}>
                                      <option value="">{t('botsPage.flow.select')}</option>
                                      {activeFlow.steps.filter(s => s.id !== step.id).map(s => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                      ))}
                                    </select>
                                  </div>
                                )}
                                {btn.action.type === 'LINK_TO_PRODUCT' && products.length > 0 && (
                                  <div className="form-group" style={{ margin: '8px 0 0' }}>
                                    <label style={{ fontSize: 11 }}>{t('botsPage.flow.product')}</label>
                                    <select className="input" value={btn.action.payload || ''}
                                      onChange={(e) => updateButton(activeFlowIndex, stepIndex, btnIndex, {
                                        action: { ...btn.action, payload: e.target.value },
                                      })}
                                      style={{ padding: '8px 10px', fontSize: 13 }}>
                                      <option value="">{t('botsPage.flow.select')}</option>
                                      {products.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                      ))}
                                    </select>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <button type="button" className="btn btn-primary" disabled={saving}
              onClick={() => onSave(flows)}>
              <Save size={16} /> {saving ? t('botsPage.flow.saving') : t('botsPage.flow.saveFlows')}
            </button>
          </div>
        )}
      </div>

      <div style={{
        position: 'sticky',
        top: 20,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 12,
      }}>
        <div style={{
          fontSize: 12,
          fontWeight: 700,
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}>
          <Eye size={13} /> Live Preview
        </div>
        {livePreviewStep ? (
          <TelegramPreview step={livePreviewStep} />
        ) : (
          <div style={{
            width: 280,
            height: 300,
            background: 'var(--bg-secondary)',
            borderRadius: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid var(--border)',
            color: 'var(--text-muted)',
            fontSize: 13,
            textAlign: 'center',
            padding: 24,
          }}>
            {t('botsPage.flow.livePreviewEmpty')}
          </div>
        )}
        <span style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>
          {t('botsPage.flow.livePreviewHint')}
        </span>
      </div>
    </div>
  );
}
