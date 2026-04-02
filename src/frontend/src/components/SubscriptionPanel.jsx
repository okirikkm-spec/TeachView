import { useState, useEffect } from 'react';
import { fetchTiers, subscribe, unsubscribe, checkSubscription } from '../services/subscriptionApi';

export default function SubscriptionPanel({ authorId, currentUserId }) {
  const [tiers, setTiers] = useState([]);
  const [currentSub, setCurrentSub] = useState(null);
  const [selectedTier, setSelectedTier] = useState(null);
  const [paymentStep, setPaymentStep] = useState(null); // null | 'select' | 'paying' | 'success'
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authorId || authorId === currentUserId) { setLoading(false); return; }
    fetchTiers(authorId)
      .then(t => setTiers(t))
      .catch(() => {});
    if (currentUserId) {
      checkSubscription(authorId)
        .then(sub => setCurrentSub(sub))
        .catch(() => {});
    }
    setLoading(false);
  }, [authorId, currentUserId]);

  if (loading || !currentUserId || authorId === currentUserId || tiers.length === 0) return null;
  const handleSubscribe = (tier) => {
    setSelectedTier(tier);
    setPaymentStep('select');
  };

  const handlePay = async () => {
    setPaymentStep('paying');
    // Эмуляция оплаты — задержка 1.5 сек
    await new Promise(r => setTimeout(r, 1500));
    try {
      const sub = await subscribe(selectedTier.id);
      setCurrentSub(sub);
      setPaymentStep('success');
      setTimeout(() => { setPaymentStep(null); setSelectedTier(null); }, 2000);
    } catch {
      setPaymentStep(null);
    }
  };

  const handleUnsubscribe = async () => {
    try {
      await unsubscribe(authorId);
      setCurrentSub(null);
    } catch { /* ignore */ }
  };

  const handleUpgrade = (tier) => {
    setSelectedTier(tier);
    setPaymentStep('select');
  };

  return (
    <div className="subscription-panel card">
      <p className="card-title">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
        Подписка
      </p>

      {currentSub && !paymentStep && (
        <div className="sub-active-banner">
          <div className="sub-active-info">
            <span className="sub-active-badge">Активна</span>
            <span className="sub-active-tier">{currentSub.tier?.name}</span>
            <span className="sub-active-price">{currentSub.tier?.price} &#8381;/мес</span>
          </div>
          <div className="sub-active-actions">
            {tiers.filter(t => t.price > (currentSub.tier?.price || 0)).length > 0 && (
              <div className="sub-upgrade-options">
                <span className="sub-upgrade-label">Повысить уровень:</span>
                {tiers.filter(t => t.price > (currentSub.tier?.price || 0)).map(t => (
                  <button key={t.id} className="btn btn-primary btn-sm" onClick={() => handleUpgrade(t)}>
                    {t.name} — {t.price} &#8381;
                  </button>
                ))}
              </div>
            )}
            <button className="btn btn-ghost btn-sm" style={{ color: 'var(--error)' }} onClick={handleUnsubscribe}>
              Отменить подписку
            </button>
          </div>
        </div>
      )}

      {!currentSub && !paymentStep && (
        <div className="tier-cards-row">
          {tiers.map(tier => (
            <div key={tier.id} className="tier-offer-card">
              <div className="tier-offer-name">{tier.name}</div>
              <div className="tier-offer-price">{tier.price} <span>&#8381;/мес</span></div>
              {tier.description && <p className="tier-offer-desc">{tier.description}</p>}
              <button className="btn btn-primary" onClick={() => handleSubscribe(tier)}>
                Подписаться
              </button>
            </div>
          ))}
        </div>
      )}

      {paymentStep === 'select' && selectedTier && (
        <div className="payment-modal-overlay" onClick={() => { setPaymentStep(null); setSelectedTier(null); }}>
          <div className="payment-modal" onClick={e => e.stopPropagation()}>
            <h3 className="payment-modal-title">Оформление подписки</h3>
            <div className="payment-summary">
              <div className="payment-tier-name">{selectedTier.name}</div>
              <div className="payment-tier-price">{selectedTier.price} &#8381;/мес</div>
              {selectedTier.description && <p className="payment-tier-desc">{selectedTier.description}</p>}
            </div>
            <div className="payment-card-form">
              <div className="input-group">
                <label className="input-label">Номер карты</label>
                <input className="input" placeholder="4242 4242 4242 4242" defaultValue="4242 4242 4242 4242" />
              </div>
              <div className="payment-card-row">
                <div className="input-group">
                  <label className="input-label">Срок</label>
                  <input className="input" placeholder="12/28" defaultValue="12/28" />
                </div>
                <div className="input-group">
                  <label className="input-label">CVC</label>
                  <input className="input" placeholder="123" defaultValue="123" />
                </div>
              </div>
            </div>
            <button className="btn btn-primary" style={{ width: '100%', marginTop: '16px' }} onClick={handlePay}>
              Оплатить {selectedTier.price} &#8381;
            </button>
            <button className="btn btn-ghost" style={{ width: '100%', marginTop: '8px' }} onClick={() => { setPaymentStep(null); setSelectedTier(null); }}>
              Отмена
            </button>
          </div>
        </div>
      )}

      {paymentStep === 'paying' && (
        <div className="payment-modal-overlay">
          <div className="payment-modal payment-processing">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
            <p style={{ marginTop: '16px', color: 'var(--text-muted)' }}>Обработка платежа...</p>
          </div>
        </div>
      )}

      {paymentStep === 'success' && (
        <div className="payment-modal-overlay">
          <div className="payment-modal payment-processing">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <p style={{ marginTop: '16px', color: 'var(--success)' }}>Подписка оформлена!</p>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
