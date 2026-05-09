import { events as fallbackEvents } from '../../data/eventsData';
import { DynamicIcon } from '../../shared/Icons';
import './EventsSection.css';

const ANIMATION_STAGGER_DELAY = 0.11;

export default function EventsSection({ onEventClick, events = fallbackEvents }) {
  return (
    <section className="section" id="section-events">
      <div className="container">
        <div className="ns-reveal">
          <h2 className="section-title pop-word">Our Events</h2>
          <p className="section-subtitle pop-in" style={{ animationDelay: '0.1s' }}>
            Where Ideas Come to Life
          </p>
        </div>
        
        <div className="events-timeline">
          {events.map((ev, i) => {
            const isKSS = ev.id === 1 || ev.id === 'kss-153' || String(ev.shortName || '').toLowerCase().includes('kss');
            
            return (
              <div className="timeline-item" key={ev.id}>
                <div className={`timeline-dot${ev.status === 'upcoming' ? ' upcoming' : ''}`} />
                <div
                  className={`timeline-card shimmer ${i % 2 === 0 ? 'pop-left' : 'pop-right'} ${isKSS ? 'clickable' : ''}`}
                  style={{
                    animationDelay: `${i * ANIMATION_STAGGER_DELAY}s`,
                    cursor: isKSS ? 'none' : 'default',
                  }}
                  onClick={isKSS ? () => onEventClick?.(ev) : undefined}
                >
                  <div className="timeline-event-header">
                    <DynamicIcon name={ev.icon} size={24} />
                    <div className={`timeline-event-name ${isKSS ? 'kss' : ''}`}>
                      {ev.name}
                    </div>
                    {isKSS && <span className="view-details-badge">View Details →</span>}
                  </div>
                  
                  <div className="timeline-event-date"><DynamicIcon name="Calendar" size={14} style={{ marginRight: '6px' }} />{ev.date}</div>
                  <p className="timeline-event-desc">{ev.description}</p>
                  
                  <div className="timeline-badges">
                    <span className={`timeline-badge ${ev.status}`}>
                      {ev.status === 'completed' ? <><DynamicIcon name="CheckCircle" size={14} style={{ marginRight: '4px' }} /> Completed</> : <><DynamicIcon name="Calendar" size={14} style={{ marginRight: '4px' }} /> Upcoming</>}
                    </span>
                    {ev.tags?.map(t => (
                      <span key={t} className="tag-badge">{t}</span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
          
          {events.length > 0 && (
            <div className="timeline-item">
              <div className="timeline-dot upcoming" />
              <div className="timeline-card pop-in timeline-placeholder">
                <DynamicIcon name="Rocket" size={24} style={{ color: 'var(--c1)', marginBottom: '8px' }} />
                <p>More events are being planned. Watch this space!</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
