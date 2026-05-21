// src/components/recommendation/PersonalizedFeed.jsx
import { useState, useEffect } from 'react';
import { useRecommendations } from '../../hooks/useRecommendations';
import { DynamicIcon } from '../../shared/Icons';

export default function PersonalizedFeed({ events }) {
  const {
    recommendations,
    userInterests,
    loading,
    trackEvent,
    getSimilarEvents
  } = useRecommendations(events);
  
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showSimilar, setShowSimilar] = useState(false);

  const handleEventClick = (event) => {
    trackEvent(event.id, 'view', {
      category: event.category,
      tags: event.tags
    });
    setSelectedEvent(event);
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <div style={{ width: '40px', height: '40px', border: '2px solid #CC1111', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto' }}></div>
        <p style={{ color: '#9CA3AF', marginTop: '16px' }}>Analyzing your interests...</p>
      </div>
    );
  }

  return (
    <div>
      {/* User Interests Section */}
      {userInterests && (
        <div style={{ marginBottom: '32px', padding: '20px', background: '#1A1A1A', borderRadius: '16px' }}>
          <h3 style={{ color: '#FFFFFF', marginBottom: '12px', fontSize: '16px' }}>Your Interests</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {userInterests.topCategories.map(cat => (
              <span key={cat} style={{ padding: '4px 12px', background: '#CC1111', color: 'white', borderRadius: '20px', fontSize: '12px' }}>
                {cat}
              </span>
            ))}
            {userInterests.topTags.slice(0, 5).map(tag => (
              <span key={tag} style={{ padding: '4px 12px', background: '#2A2A2A', color: '#9CA3AF', borderRadius: '20px', fontSize: '12px' }}>
                {tag}
              </span>
            ))}
          </div>
          <p style={{ color: '#6B7280', fontSize: '12px', marginTop: '12px' }}>
            Based on {userInterests.totalInteractions} interactions
          </p>
        </div>
      )}

      {/* Recommendations Section */}
      <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#FFFFFF', marginBottom: '20px' }}>
        Recommended for You
      </h2>
      
      {recommendations.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', background: '#1A1A1A', borderRadius: '16px' }}>
          <p style={{ color: '#6B7280' }}>No recommendations yet. Start exploring events!</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '16px' }}>
          {recommendations.map(rec => (
            <div
              key={rec.id}
              onClick={() => handleEventClick(rec)}
              style={{
                background: '#1A1A1A',
                border: '1px solid #2A2A2A',
                borderRadius: '16px',
                padding: '20px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#CC1111';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#2A2A2A';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#FFFFFF', marginBottom: '8px' }}>
                    {rec.name}
                  </h3>
                  <p style={{ color: '#9CA3AF', fontSize: '14px', marginBottom: '8px' }}>
                    {rec.description?.substring(0, 100)}...
                  </p>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {rec.tags?.slice(0, 3).map(tag => (
                      <span key={tag} style={{ fontSize: '11px', padding: '2px 8px', background: '#2A2A2A', borderRadius: '12px', color: '#9CA3AF' }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <div style={{ textAlign: 'right', minWidth: '80px' }}>
                  <div style={{
                    fontSize: '24px',
                    fontWeight: 'bold',
                    color: rec.recommendationScore?.score > 70 ? '#10B981' : rec.recommendationScore?.score > 40 ? '#F59E0B' : '#6B7280'
                  }}>
                    {rec.recommendationScore?.score}%
                  </div>
                  <div style={{ fontSize: '11px', color: '#6B7280' }}>Match Score</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Similar Events Modal */}
      {selectedEvent && showSimilar && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(4px)'
        }} onClick={() => setShowSimilar(false)}>
          <div style={{
            background: '#1A1A1A',
            borderRadius: '24px',
            maxWidth: '500px',
            width: '90%',
            padding: '24px',
            maxHeight: '80vh',
            overflow: 'auto'
          }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ color: '#FFFFFF', marginBottom: '16px' }}>Similar to {selectedEvent.name}</h3>
            {getSimilarEvents(selectedEvent).map(similar => (
              <div key={similar.id} style={{
                padding: '12px',
                background: '#2A2A2A',
                borderRadius: '12px',
                marginBottom: '12px',
                cursor: 'pointer'
              }} onClick={() => {
                handleEventClick(similar);
                setShowSimilar(false);
              }}>
                <h4 style={{ color: '#FFFFFF', fontSize: '14px', marginBottom: '4px' }}>{similar.name}</h4>
                <p style={{ color: '#9CA3AF', fontSize: '12px' }}>{similar.description?.substring(0, 80)}</p>
              </div>
            ))}
            <button onClick={() => setShowSimilar(false)} style={{
              width: '100%',
              padding: '12px',
              background: '#CC1111',
              border: 'none',
              borderRadius: '12px',
              color: 'white',
              cursor: 'pointer',
              marginTop: '16px'
            }}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}