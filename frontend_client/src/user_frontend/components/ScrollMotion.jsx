import React, { useRef } from 'react';

import {
  motion,
  useReducedMotion,  useScroll,
  useSpring,
  useTransform,
} from 'framer-motion';

import '../styles/ScrollMotion.css';


/* ============================================================
   SCROLL MOTION
   ------------------------------------------------------------
   ScrollReveal = entrance animation

   ScrollMotion = scroll-linked animation

   Đây là phần tạo cảm giác website 3D / AI.
============================================================ */

const ScrollMotion = ({
  children,

  variant = 'depth',

  strength = 1,

  direction = 'up',

  className = '',

  disabled = false,

  top = false,

  perspective = true,

  ...rest
}) => {
  const ref = useRef(null);

  const reducedMotion = useReducedMotion();


  /* ==========================================================
     SCROLL PROGRESS

     start end:
       phần tử bắt đầu đi vào viewport

     center center:
       phần tử ở giữa màn hình

     end start:
       phần tử đi ra khỏi viewport
  ========================================================== */

  const { scrollYProgress } = useScroll({
    target: ref,

    offset: [
      'start end',
      'center center',
      'end start',
    ],
  });


  /* ==========================================================
     SMOOTH SPRING

     Không lấy scroll progress trực tiếp.

     Spring giúp chuyển động:
     - mềm
     - không giật
     - không snap
  ========================================================== */

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 90,
    damping: 26,
    mass: 0.7,
  });


  /* ==========================================================
     STRENGTH
  ========================================================== */

  const s = Math.max(
    0,
    Math.min(Number(strength) || 1, 1.5)
  );


  /* ==========================================================
     DEPTH
  ========================================================== */

  let yRange = [28 * s, 0, -22 * s];

  let xRange = [0, 0, 0];

  let scaleRange = [
    0.975,
    1,
    0.985,
  ];

  let opacityRange = [
    0.35,
    1,
    0.72,
  ];

  let rotateXRange = [
    4 * s,
    0,
    -2.5 * s,
  ];

  let rotateYRange = [
    0,
    0,
    0,
  ];

  let blurRange = [
    1.5 * s,
    0,
    0.8 * s,
  ];


  /* ==========================================================
     PARALLAX
  ========================================================== */

  if (variant === 'parallax') {
    yRange = [
      45 * s,
      0,
      -40 * s,
    ];

    scaleRange = [
      0.97,
      1,
      0.98,
    ];

    opacityRange = [
      0.4,
      1,
      0.78,
    ];

    rotateXRange = [
      3 * s,
      0,
      -3 * s,
    ];
  }


  /* ==========================================================
     FLOAT
  ========================================================== */

  if (variant === 'float') {
    yRange = [
      22 * s,
      0,
      22 * s,
    ];

    scaleRange = [
      0.985,
      1,
      0.985,
    ];

    opacityRange = [
      0.7,
      1,
      0.7,
    ];

    rotateXRange = [
      2 * s,
      0,
      -2 * s,
    ];
  }


  /* ==========================================================
     CINEMATIC
  ========================================================== */

  if (variant === 'cinematic') {
    yRange = [
      55 * s,
      0,
      -45 * s,
    ];

    scaleRange = [
      0.95,
      1,
      0.965,
    ];

    opacityRange = [
      0.2,
      1,
      0.65,
    ];

    rotateXRange = [
      7 * s,
      0,
      -5 * s,
    ];

    blurRange = [
      3 * s,
      0,
      1.5 * s,
    ];
  }


  /* ==========================================================
     HORIZONTAL
  ========================================================== */

  if (direction === 'left') {
    xRange = [
      30 * s,
      0,
      -18 * s,
    ];
  }

  if (direction === 'right') {
    xRange = [
      -30 * s,
      0,
      18 * s,
    ];
  }


  /* ==========================================================
     MOTION VALUES
  ========================================================== */

  const y = useTransform(
    smoothProgress,
    [0, 0.5, 1],
    yRange
  );

  const x = useTransform(
    smoothProgress,
    [0, 0.5, 1],
    xRange
  );

  const scale = useTransform(
    smoothProgress,
    [0, 0.5, 1],
    scaleRange
  );

  const opacity = useTransform(
    smoothProgress,
    [0, 0.5, 1],
    opacityRange
  );

  const rotateX = useTransform(
    smoothProgress,
    [0, 0.5, 1],
    rotateXRange
  );

  const rotateY = useTransform(
    smoothProgress,
    [0, 0.5, 1],
    rotateYRange
  );

  const blur = useTransform(
    smoothProgress,
    [0, 0.5, 1],
    blurRange,
    (value) => `blur(${Math.max(0, value)}px)`
  );


  /* ==========================================================
     REDUCED MOTION
  ========================================================== */

  if (reducedMotion || disabled) {
    return (
      <div
        ref={ref}
        className={`scroll-motion scroll-motion--disabled ${className}`}
        {...rest}
      >
        {children}
      </div>
    );
  }


  /* ==========================================================
     RENDER
  ========================================================== */

  return (
    <motion.div
      ref={ref}

      className={[
        'scroll-motion',

        perspective
          ? 'scroll-motion--3d'
          : '',

        top
          ? 'scroll-motion--top'
          : '',

        className,
      ]
        .filter(Boolean)
        .join(' ')}

      style={{
        x,
        y,
        scale,
        opacity,

        rotateX,
        rotateY,

        filter: blur,
      }}

      {...rest}
    >
      {children}
    </motion.div>
  );
};


export default ScrollMotion;