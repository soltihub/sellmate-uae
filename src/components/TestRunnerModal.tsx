import React, { useState, useEffect } from 'react';
import { translations } from '../utils/translations';
import { TestCaseResult } from '../types';
import { runAllSystemTests } from '../utils/testSuite';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Play,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  X,
  Clock,
} from 'lucide-react';

interface TestRunnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: 'en' | 'ar';
  onTestsCompleted?: (allPassed: boolean, stats?: { total: number; passed: number }) => void;
}

export const TestRunnerModal: React.FC<TestRunnerModalProps> = ({
  isOpen,
  onClose,
  language,
  onTestsCompleted,
}) => {
  const t = translations[language];

  const [testResults, setTestResults] = useState<TestCaseResult[]>([]);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [expandedSuite, setExpandedSuite] = useState<string | null>(null);

  const runTests = async () => {
    setIsRunning(true);
    try {
      const results = await runAllSystemTests();
      setTestResults(results);
      const passedCount = results.filter((r) => r.passed).length;
      const passed = results.length > 0 && passedCount === results.length;
      if (onTestsCompleted) onTestsCompleted(passed, { total: results.length, passed: passedCount });
    } catch (e) {
      console.error('Test execution failed', e);
    } finally {
      setIsRunning(false);
    }
  };

  useEffect(() => {
    if (isOpen && testResults.length === 0) {
      runTests();
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  const totalPassed = testResults.filter((r) => r.passed).length;
  const allPassed = testResults.length > 0 && totalPassed === testResults.length;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="test-runner-title"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fadeIn"
    >
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 flex flex-col justify-between">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-sm z-10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-50 rounded-xl text-emerald-700">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 id="test-runner-title" className="font-bold text-slate-900 text-sm sm:text-base">
                {t.testsTitle}
              </h3>
              <p className="text-[11px] text-slate-500">
                {t.testsSubtitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label={t.close}
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 text-xs overflow-y-auto">
          {/* Status summary banner */}
          <div
            className={`p-4 rounded-xl border flex items-center justify-between ${
              allPassed
                ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                : 'bg-amber-50/80 border-amber-200 text-amber-950'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {allPassed ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : (
                <XCircle className="w-5 h-5 text-amber-600 shrink-0" />
              )}
              <div>
                <p className="font-bold text-sm">
                  {allPassed ? t.allPassed : t.someFailed}
                </p>
                <p className="text-[11px] text-slate-600">
                  {totalPassed} of {testResults.length} test suites verified successfully
                </p>
              </div>
            </div>

            <button
              onClick={runTests}
              disabled={isRunning}
              className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-800 rounded-lg font-bold border border-slate-200 shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} />
              <span>{isRunning ? t.runningTests : t.runAllTests}</span>
            </button>
          </div>

          {/* Test Suites List */}
          <div className="space-y-2.5">
            {testResults.map((suite, index) => {
              const isExpanded = expandedSuite === suite.id;

              return (
                <div
                  key={suite.id}
                  className="border border-slate-200/80 rounded-xl overflow-hidden bg-slate-50/50"
                >
                  <button
                    onClick={() => setExpandedSuite(isExpanded ? null : suite.id)}
                    className="w-full p-3.5 flex items-center justify-between text-start hover:bg-slate-100/60 transition-colors cursor-pointer"
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="mt-0.5">
                        {suite.passed ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <XCircle className="w-4 h-4 text-rose-600" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-xs">
                            {index + 1}. {language === 'ar' ? suite.suiteNameAr : suite.suiteNameEn}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {suite.durationMs}ms
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {language === 'ar' ? suite.descriptionAr : suite.descriptionEn}
                        </p>
                      </div>
                    </div>

                    <div className="text-slate-400">
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </div>
                  </button>

                  {/* Expanded Assertions Log */}
                  {isExpanded && (
                    <div className="p-3.5 bg-white border-t border-slate-200 space-y-2 text-xs">
                      <div className="font-bold text-[11px] text-slate-500 uppercase tracking-wider">
                        Assertions ({suite.assertions.length}):
                      </div>
                      <div className="space-y-1.5">
                        {suite.assertions.map((assertion, aIdx) => (
                          <div
                            key={aIdx}
                            className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100 text-[11px]"
                          >
                            <span className="font-medium text-slate-700">
                              {assertion.name}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-slate-500">
                                Exp: {String(assertion.expected)} | Act: {String(assertion.actual)}
                              </span>
                              <span
                                className={`font-bold px-1.5 py-0.2 rounded text-[10px] ${
                                  assertion.passed
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-rose-100 text-rose-800'
                                }`}
                              >
                                {assertion.passed ? 'PASS' : 'FAIL'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 text-white font-bold rounded-xl text-xs hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {t.close}
          </button>
        </div>
      </div>
    </div>
  );
};
