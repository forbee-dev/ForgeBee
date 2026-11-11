import React from 'react';
import {Composition, registerRoot} from 'remotion';
import {Promo, TOTAL_FRAMES} from './Promo';

registerRoot(() =>
  React.createElement(Composition, {
    id: 'Promo',
    component: Promo,
    durationInFrames: TOTAL_FRAMES,
    fps: 30,
    width: 1920,
    height: 1080,
  }),
);
