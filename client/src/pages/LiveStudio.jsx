import React, { useState, useEffect } from 'react';

const LiveStudio = () => {
    return (
        <div style={{ background: '#04040a', minHeight: '100vh', color: '#e8e8ee', padding: '40px', fontFamily: 'DM Sans' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h1 style={{ fontFamily: 'Bebas Neue', color: '#c9a84c', fontSize: '3.5rem' }}>EMPIRE LIVE COMMAND</h1>
                <div style={{ padding: '10px 20px', background: '#3dffa022', border: '1px solid #3dffa0', color: '#3dffa0', borderRadius: '4px' }}>
                    SYSTEM STATUS: OPTIMAL
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginTop: '30px' }}>
                <div style={{ background: '#0d0d1c', padding: '20px', border: '1px solid #18182e' }}>
                    <span style={{ color: '#555570', fontSize: '0.8rem' }}>GLOBAL REVENUE (24H)</span>
                    <h2 style={{ color: '#f0d080' }}>$63,000,000</h2>
                </div>
                <div style={{ background: '#0d0d1c', padding: '20px', border: '1px solid #18182e' }}>
                    <span style={{ color: '#555570', fontSize: '0.8rem' }}>ACTIVE SWARM SHARDS</span>
                    <h2 style={{ color: '#a855f7' }}>100,000 / 100k</h2>
                </div>
                <div style={{ background: '#0d0d1c', padding: '20px', border: '1px solid #18182e' }}>
                    <span style={{ color: '#555570', fontSize: '0.8rem' }}>NVME SEEDING RATE</span>
                    <h2 style={{ color: '#00e0c0' }}>842 hits/sec</h2>
                </div>
                <div style={{ background: '#0d0d1c', padding: '20px', border: '1px solid #18182e' }}>
                    <span style={{ color: '#555570', fontSize: '0.8rem' }}>AI AVATARS LIVE</span>
                    <h2 style={{ color: '#ff3d6e' }}>4,291</h2>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', marginTop: '20px' }}>
                <div style={{ background: '#080812', border: '1px solid #18182e', height: '400px', padding: '20px' }}>
                    <h3 style={{ color: '#c9a84c' }}>LIVE AGENT TRAFFIC FLOW</h3>
                    <div style={{ marginTop: '20px', color: '#555570', fontSize: '0.9rem' }}>
                        <p>[14:02:11] Shard #442: Lead generated in UK (London) - $497 Subscription</p>
                        <p>[14:02:15] Shard #881: TikTok Seeding Successful - Viral Index 8.4</p>
                        <p>[14:02:18] Shard #102: NVME Handshake confirmed via seedToNVME()</p>
                    </div>
                </div>
                <div style={{ background: '#080812', border: '1px solid #18182e', padding: '20px' }}>
                    <h3 style={{ color: '#c9a84c' }}>PLATFORM SYNC</h3>
                    <ul style={{ listStyle: 'none', marginTop: '20px' }}>
                        <li style={{ color: '#3dffa0' }}>? TIKTOK: CONNECTED</li>
                        <li style={{ color: '#3dffa0' }}>? NVME.LIVE: CONNECTED</li>
                        <li style={{ color: '#3dffa0' }}>? GLOWX: CONNECTED</li>
                        <li style={{ color: '#ff3d6e' }}>? YOUTUBE: CONNECTING...</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};
export default LiveStudio;
