import React from 'react';
import ProjectRecommendations from '../../components/recommendations/ProjectRecommendations';
import '../../styles/resume.css';

export default function RecommendationsPage({ onBack }) {
  return (
    <div className="ra-page">
      <ProjectRecommendations onBack={onBack} />
    </div>
  );
}
