import React, { useState, useMemo, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Share2 } from 'lucide-react';

// Configuration
const DEFAULT_CONFIG = {
  colorScheme: {
    withChildcare: '#8B008B',
    withoutChildcare: '#484848',
    takeHomePay: '#4CAF50',
    referenceLine: '#E91E63'
  },
  ranges: {
    housing: {
      min: 2000,
      max: 20000,
      step: 500
    },
    variableExpenses: {
      min: 1000,
      max: 10000,
      step: 500,
      default: 3000
    },
    childcare: {
      min: 1000,
      max: 10000,
      step: 500,
      default: 3000
    }
  }
};

// Utility functions
const formatCurrency = (value: number | bigint) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

const calculateRequiredIncome = (monthlyExpenses: number, savingsRate: number, taxRate: number) => {
  const annualExpenses = monthlyExpenses * 12;
  const afterSavingsNeeded = annualExpenses / (1 - savingsRate);
  const totalNeeded = afterSavingsNeeded / (1 - taxRate);
  return totalNeeded;
};

const encodeScenario = (params: { variableExpenses: number; childcareCost: number; savingsRate: number; taxRate: number; }) => {
  return btoa(JSON.stringify(params));
};

const decodeScenario = (encoded: string) => {
  try {
    return JSON.parse(atob(encoded));
  } catch (e) {
    return null;
  }
};

// Tooltip Component
function CustomTooltip({ active, payload, label }): React.JSX.Element | null {
  if (!active || !payload || !payload.length || label === undefined) return null;

  return (
    <div className="bg-white p-4 border border-gray-200 rounded shadow">
      <p className="font-bold mb-2">Monthly Housing Cost: {formatCurrency(label)}</p>
      {payload.map((entry: { color: any; name: string | number | bigint | boolean | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | React.ReactPortal | Promise<string | number | bigint | boolean | React.ReactPortal | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | null | undefined> | null | undefined; value: number | bigint; }, index: React.Key | null | undefined) => (
        <p key={index} style={{ color: entry.color }} className="text-sm">
          {entry.name}: {formatCurrency(entry.value)}
        </p>
      ))}
    </div>
  );
}

// Main Component
const IncomeScenarioCalculator = () => {
  const [scenarioParams, setScenarioParams] = useState({
    variableExpenses: DEFAULT_CONFIG.ranges.variableExpenses.default,
    childcareCost: DEFAULT_CONFIG.ranges.childcare.default,
    savingsRate: 10,
    taxRate: 41
  });
  
  const [shareUrl, setShareUrl] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const scenarioParam = urlParams.get('scenario');
      
      if (scenarioParam) {
        const decoded = decodeScenario(scenarioParam);
        if (decoded) {
          setScenarioParams(decoded);
        }
      }
    }
  }, []);

  const chartData = useMemo(() => {
    const points = [];
    const { min, max, step } = DEFAULT_CONFIG.ranges.housing;
    
    for (let housingCost = min; housingCost <= max; housingCost += step) {
      const baseMonthlyExpenses = housingCost + scenarioParams.variableExpenses;
      const withoutChildcare = calculateRequiredIncome(
        baseMonthlyExpenses, 
        scenarioParams.savingsRate/100, 
        scenarioParams.taxRate/100
      );
      const withChildcare = calculateRequiredIncome(
        baseMonthlyExpenses + scenarioParams.childcareCost, 
        scenarioParams.savingsRate/100, 
        scenarioParams.taxRate/100
      );
      
      points.push({
        housingCost,
        withChildcare,
        withoutChildcare,
        takeHomePay: withoutChildcare * (1 - scenarioParams.taxRate/100) - (baseMonthlyExpenses * 12)
      });
    }
    
    return points;
  }, [scenarioParams]);

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Income Scenario Calculator</h1>
        <Button 
          onClick={() => {
            if (typeof window !== 'undefined') {
              const encoded = encodeScenario(scenarioParams);
              const url = `${window.location.origin}${window.location.pathname}?scenario=${encoded}`;
              setShareUrl(url);
              navigator.clipboard.writeText(url);
            }
          }}
          className="inline-flex items-center"
        >
          <Share2 className="w-4 h-4 mr-2" />
          Share Scenario
        </Button>
      </div>

      {shareUrl && (
        <div className="mb-6 p-4 bg-green-50 text-green-800 rounded-md">
          Scenario link copied to clipboard!
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="space-y-2">
          <label className="block text-sm font-medium">Variable Expenses (Monthly)</label>
          <Slider
            defaultValue={[scenarioParams.variableExpenses]}
            value={[scenarioParams.variableExpenses]}
            max={DEFAULT_CONFIG.ranges.variableExpenses.max}
            min={DEFAULT_CONFIG.ranges.variableExpenses.min}
            step={DEFAULT_CONFIG.ranges.variableExpenses.step}
            onValueChange={([value]) => setScenarioParams(prev => ({ ...prev, variableExpenses: value }))}
          />
          <div className="text-sm text-gray-600">{formatCurrency(scenarioParams.variableExpenses)}</div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium">Childcare Cost (Monthly)</label>
          <Slider
            defaultValue={[scenarioParams.childcareCost]}
            value={[scenarioParams.childcareCost]}
            max={DEFAULT_CONFIG.ranges.childcare.max}
            min={DEFAULT_CONFIG.ranges.childcare.min}
            step={DEFAULT_CONFIG.ranges.childcare.step}
            onValueChange={([value]) => setScenarioParams(prev => ({ ...prev, childcareCost: value }))}
          />
          <div className="text-sm text-gray-600">{formatCurrency(scenarioParams.childcareCost)}</div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium">Target Savings Rate</label>
          <Slider
            defaultValue={[scenarioParams.savingsRate]}
            value={[scenarioParams.savingsRate]}
            max={20}
            min={0}
            step={1}
            onValueChange={([value]) => setScenarioParams(prev => ({ ...prev, savingsRate: value }))}
          />
          <div className="text-sm text-gray-600">{scenarioParams.savingsRate}%</div>
        </div>
      </div>

      <div className="h-96 w-full mb-4">
        <ResponsiveContainer>
          <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="housingCost" 
              tickFormatter={formatCurrency}
              tickCount={8}
            />
            <YAxis 
              tickFormatter={formatCurrency}
              tickCount={12}
            />
            <Tooltip content={CustomTooltip} />
            <Legend />
            
            <Line
              type="monotone"
              dataKey="withChildcare"
              stroke={DEFAULT_CONFIG.colorScheme.withChildcare}
              name="Required Income (With Childcare)"
              strokeWidth={2}
            />
            <Line
              type="monotone"
              dataKey="withoutChildcare"
              stroke={DEFAULT_CONFIG.colorScheme.withoutChildcare}
              name="Required Income (No Childcare)"
              strokeWidth={2}
            />
            <Line
              type="monotone"
              dataKey="takeHomePay"
              stroke={DEFAULT_CONFIG.colorScheme.takeHomePay}
              name="Take Home Pay (After Expenses)"
              strokeWidth={2}
            />
            <ReferenceLine 
              y={75000} 
              stroke={DEFAULT_CONFIG.colorScheme.referenceLine}
              strokeDasharray="3 3"
              label={{ 
                value: 'Median Household Income',
                position: 'right',
                fill: DEFAULT_CONFIG.colorScheme.referenceLine
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="text-sm text-gray-600">
        <p>Notes:</p>
        <ul className="list-disc ml-5">
          <li>All calculations assume a {scenarioParams.taxRate}% effective tax rate</li>
          <li>Take home pay is calculated after taxes, savings, and all specified expenses</li>
          <li>Share your scenario using the button above to save and share your custom parameters</li>
        </ul>
      </div>
    </div>
  );
};

export default IncomeScenarioCalculator;