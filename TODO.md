<<<<<<< HEAD
# TODO - Event Stream Processing & Real-Time Analytics (#1776)

- [ ] Create plan + confirm approach (done)
- [ ] Add streaming abstraction layer (Queue interface + implementations)
- [ ] Add outbox dispatcher worker (poll outbox, publish, mark delivered, idempotency)
- [ ] Wire dispatcher into server startup
- [ ] Update eventPublisher to enqueue to outbox before publish (or ensure consistent flow)
- [ ] Ensure tests use MockQueue + mock outbox without DB dependency
- [ ] Expand StreamProcessor windowing/hourly + richer dashboard payload
- [ ] Implement fraud rules (IP/payment) + enforcement
- [ ] Implement real-time recommendation regeneration pipeline
- [ ] Persist processed analytics for historical queries
- [ ] Extend QA tests to cover outbox delivery, ordering, aggregates, anomaly, fraud, recommendations
=======
# TODO - #1754 Real-Time Collaborative Whiteboard

- [ ] Create a minimal viable whiteboard component (canvas-based) with: pen/highlighter/eraser, shapes (rect/circle/triangle/line/arrow), text boxes, sticky notes, undo/redo per user.
- [ ] Implement event-linked whiteboard room routing + persistence (load/save state, autosave every 30s).
- [ ] Add real-time collaboration layer using existing socket infrastructure (Pusher/SocketProvider) and CRDT/operation log approach.
- [ ] Add presence indicators (colored cursors with names), pointer/laser tool, follow mode (presenter).
- [ ] Add templates (Kanban, mindmap, flowchart, SWOT, lean canvas) pre-populating initial state.
- [ ] Implement sticky note voting (each participant has 3 votes), reveal mode, grouping, summary generation.
- [ ] Implement export service: PNG, SVG, PDF.
- [ ] Add performance optimizations: pan/zoom smooth, lazy loading for large boards, ensure 1000+ elements handling.
- [ ] Mobile/touch drawing support.
- [ ] Add QA/concurrency test plan + minimal automated tests where possible.
>>>>>>> 9bc8f289 (feat(events): event whiteboard collaboration (CRDT/Yjs))
