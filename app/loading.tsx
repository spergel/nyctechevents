'use client';
import React from 'react';
import styles from './loading.module.css';

export default function Loading() {
  return (
    <div className={styles['loading-screen']}>
      <div className={styles['loading-content']}>
        <div className={styles['loading-spinner']}></div>
        <div className={styles['loading-text']}>LOADING NYC DATA</div>
        <div className={styles['loading-progress']}></div>
      </div>
    </div>
  );
} 