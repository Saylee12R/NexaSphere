import React, { useState } from 'react';
import ShareHub from './ShareHub';

const EventCard = React.memo(function EventCard({ event, onClick, id }) {
  const [shareOpen, setShareOpen] = useState(false);

  function handleShareClick(e) {
    e.stopPropagation(); // don't trigger the card's onClick
    setShareOpen(true);
  }

  return (
    <>
      <div className="event-card" onClick={() => onClick(id)} style={{ cursor: 'pointer' }}>
        <h3>{event.title}</h3>
        <p>{event.date}</p>
        <p>{event.description}</p>
        {event.location && <p>{event.location}</p>}
        {event.category && <span className="event-category">{event.category}</span>}
        <button
          className="event-share-btn"
          onClick={handleShareClick}
          aria-label={`Share ${event.title}`}
        >
          Share
        </button>
      </div>

      <ShareHub
        isOpen={shareOpen}
        onClose={() => setShareOpen(false)}
        data={{
          title: event.title,
          subtitle: event.date,
          url: `${window.location.origin}/events/${id}`,
          image: event.image || null,
        }}
      />
    </>
  );
});

export default EventCard;
