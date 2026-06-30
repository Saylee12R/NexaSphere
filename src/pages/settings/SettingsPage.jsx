import { useTranslation } from 'react-i18next';
import Footer from '../../shared/Footer';
import { BannerOrbs } from '../../shared/MotionLayer';

export default function SettingsPage({ onBack }) {
  const { i18n } = useTranslation();
  const currentLang = i18n.language ? i18n.language.split('-')[0] : 'en';

  const handleLanguageChange = (e) => {
    i18n.changeLanguage(e.target.value);
  };

  return (
    <div
      id="settings-page"
      style={{ minHeight: '100vh', paddingBottom: '100px', background: '#0A0A0A' }}
    >
      <div
        className="page-banner"
        style={{
          background: 'linear-gradient(135deg, rgba(204,17,17,0.04), rgba(0,0,0,0))',
          borderBottom: '1px solid #1F1F1F',
          padding: '60px 0 50px',
          textAlign: 'center',
          marginBottom: '60px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          className="page-banner-line"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '2px',
            background: 'linear-gradient(90deg, #CC1111, #3B82F6, #8B5CF6)',
          }}
        />
        <BannerOrbs color="rgba(204,17,17,0.04)" />

        <button
          onClick={onBack}
          style={{
            position: 'absolute',
            top: '20px',
            left: '28px',
            background: '#1A1A1A',
            border: '1px solid #2A2A2A',
            borderRadius: '100px',
            padding: '6px 16px',
            color: '#9CA3AF',
            fontSize: '.75rem',
            cursor: 'pointer',
            fontFamily: "'Rajdhani', sans-serif",
            fontWeight: 500,
          }}
        >
          &larr; Back
        </button>

        <span
          style={{
            color: '#CC1111',
            fontSize: '0.75rem',
            letterSpacing: '2px',
            textTransform: 'uppercase',
            display: 'inline-block',
            marginBottom: '16px',
          }}
        >
          NexaSphere · GL Bajaj
        </span>
        <h1
          style={{
            fontSize: 'clamp(2rem, 5vw, 3rem)',
            fontWeight: 'bold',
            color: '#FFFFFF',
            marginBottom: '16px',
          }}
        >
          Settings
        </h1>
        <p style={{ color: '#9CA3AF', maxWidth: '520px', margin: '0 auto' }}>
          Configure your preferences
        </p>
      </div>

      <div className="container">
        <div
          style={{
            background: '#1A1A1A',
            border: '1px solid #2A2A2A',
            borderRadius: '16px',
            padding: '32px',
            maxWidth: '600px',
            margin: '0 auto',
          }}
        >
          <div style={{ marginBottom: '24px' }}>
            <h2
              style={{
                fontSize: '18px',
                fontWeight: 'bold',
                color: '#FFFFFF',
                marginBottom: '8px',
              }}
            >
              Language Selection
            </h2>
            <p style={{ color: '#9CA3AF', fontSize: '14px', marginBottom: '16px' }}>
              Choose your preferred language for the NexaSphere platform.
            </p>
            <select
              value={currentLang}
              onChange={handleLanguageChange}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '8px',
                background: '#0F0F0F',
                border: '1px solid #2A2A2A',
                color: '#FFFFFF',
                fontSize: '14px',
                outline: 'none',
                cursor: 'pointer',
                fontFamily: "'Inter', sans-serif",
              }}
            >
              <option value="en">English</option>
              <option value="hi">हिंदी (Hindi)</option>
              <option value="es">Español (Spanish)</option>
            </select>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
