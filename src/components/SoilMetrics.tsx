'use client';

import React, { useEffect, useState } from 'react';

interface SoilData {
    location: string;
    soil_pH: number;
    nitrogen: number;
    organic_carbon: number;
    sand_content: number;
    clay_content: number;
    soil_moisture: number;
}

const SoilMetrics: React.FC = () => {
    const [soilData, setSoilData] = useState<SoilData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchSoilData = async () => {
            try {
                const response = await fetch('/dummy_soil_data.json');
                if (!response.ok) throw new Error('Failed to load soil data');
                const data = await response.json();
                setSoilData(data);
            } catch (err) {
                console.error('Soil data error:', err);
                setError('Failed to load soil data.');
            } finally {
                setLoading(false);
            }
        };

        fetchSoilData();
    }, []);

    return (
        <div className="p-4 bg-green-800/10 backdrop-blur-sm rounded-xl text-white shadow-lg mt-4">
            <h2 className="text-lg font-bold mb-2">🌱 Soil Metrics</h2>

            {loading && <div className="animate-pulse text-sm">Loading soil data...</div>}

            {error && <div className="text-red-300 text-sm">{error}</div>}

            {soilData && (
                <div className="space-y-1 text-sm">
                    <div>🌡️ Soil pH: <span className="font-medium">{soilData.soil_pH}</span></div>
                    <div>🧪 Nitrogen: <span className="font-medium">{soilData.nitrogen}%</span></div>
                    <div>🪵 Organic Carbon: <span className="font-medium">{soilData.organic_carbon}%</span></div>
                    <div>🏖️ Sand Content: <span className="font-medium">{soilData.sand_content}%</span></div>
                    <div>🪨 Clay Content: <span className="font-medium">{soilData.clay_content}%</span></div>
                    <div>💧 Soil Moisture: <span className="font-medium">{soilData.soil_moisture}%</span></div>
                </div>
            )}
        </div>
    );
};

export default SoilMetrics;
