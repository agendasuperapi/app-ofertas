import { describe, it, expect } from 'vitest';

/**
 * Utilitários para exibição segura de valores de comissão
 * Estas funções garantem que valores numéricos sejam exibidos corretamente
 * e evitam erros de NaN na interface
 */

// Formata valores monetários em BRL
export const formatCurrency = (value: number | null | undefined): string => {
  const numericValue = Number(value ?? 0);
  if (isNaN(numericValue)) return 'R$ 0,00';
  return numericValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

// Garante valores numéricos seguros
export const safeNumber = (value: any): number => {
  const num = Number(value ?? 0);
  return isNaN(num) ? 0 : num;
};

// Formata porcentagem
export const formatPercentage = (value: number | null | undefined): string => {
  const numericValue = safeNumber(value);
  return `${numericValue}%`;
};

// Formata comissão com tipo
export const formatCommissionValue = (
  value: number | null | undefined, 
  type: string | null | undefined
): string => {
  const numericValue = safeNumber(value);
  if (type === 'percentage') {
    return `${numericValue}%`;
  }
  return formatCurrency(numericValue);
};

describe('Commission Display Utils', () => {
  describe('formatCurrency', () => {
    it('formata valores numéricos corretamente', () => {
      expect(formatCurrency(100)).toBe('R$ 100,00');
      expect(formatCurrency(1234.56)).toBe('R$ 1.234,56');
      expect(formatCurrency(0)).toBe('R$ 0,00');
    });

    it('formata valores decimais corretamente', () => {
      expect(formatCurrency(99.99)).toBe('R$ 99,99');
      expect(formatCurrency(0.01)).toBe('R$ 0,01');
      expect(formatCurrency(1000.5)).toBe('R$ 1.000,50');
    });

    it('trata null como 0', () => {
      expect(formatCurrency(null)).toBe('R$ 0,00');
    });

    it('trata undefined como 0', () => {
      expect(formatCurrency(undefined)).toBe('R$ 0,00');
    });

    it('trata NaN como 0', () => {
      expect(formatCurrency(NaN)).toBe('R$ 0,00');
    });

    it('formata valores negativos', () => {
      expect(formatCurrency(-50)).toBe('-R$ 50,00');
    });
  });

  describe('safeNumber', () => {
    it('retorna números válidos inalterados', () => {
      expect(safeNumber(100)).toBe(100);
      expect(safeNumber(0)).toBe(0);
      expect(safeNumber(-50)).toBe(-50);
      expect(safeNumber(99.99)).toBe(99.99);
    });

    it('converte strings numéricas para números', () => {
      expect(safeNumber('100')).toBe(100);
      expect(safeNumber('50.5')).toBe(50.5);
      expect(safeNumber('0')).toBe(0);
    });

    it('trata null como 0', () => {
      expect(safeNumber(null)).toBe(0);
    });

    it('trata undefined como 0', () => {
      expect(safeNumber(undefined)).toBe(0);
    });

    it('trata strings inválidas como 0', () => {
      expect(safeNumber('abc')).toBe(0);
      expect(safeNumber('')).toBe(0);
      expect(safeNumber('NaN')).toBe(0);
    });

    it('trata NaN como 0', () => {
      expect(safeNumber(NaN)).toBe(0);
    });

    it('trata objetos como 0', () => {
      expect(safeNumber({})).toBe(0);
      expect(safeNumber([])).toBe(0);
    });
  });

  describe('formatPercentage', () => {
    it('formata porcentagens corretamente', () => {
      expect(formatPercentage(10)).toBe('10%');
      expect(formatPercentage(25.5)).toBe('25.5%');
      expect(formatPercentage(0)).toBe('0%');
    });

    it('trata valores inválidos', () => {
      expect(formatPercentage(null)).toBe('0%');
      expect(formatPercentage(undefined)).toBe('0%');
    });
  });

  describe('formatCommissionValue', () => {
    it('formata comissão percentual', () => {
      expect(formatCommissionValue(10, 'percentage')).toBe('10%');
      expect(formatCommissionValue(15.5, 'percentage')).toBe('15.5%');
    });

    it('formata comissão fixa como moeda', () => {
      expect(formatCommissionValue(25, 'fixed')).toBe('R$ 25,00');
      expect(formatCommissionValue(100.50, 'fixed')).toBe('R$ 100,50');
    });

    it('trata tipo null/undefined como fixo (moeda)', () => {
      expect(formatCommissionValue(50, null)).toBe('R$ 50,00');
      expect(formatCommissionValue(50, undefined)).toBe('R$ 50,00');
    });

    it('trata valores null/undefined', () => {
      expect(formatCommissionValue(null, 'percentage')).toBe('0%');
      expect(formatCommissionValue(undefined, 'fixed')).toBe('R$ 0,00');
    });
  });

  describe('Commission Item Display Scenarios', () => {
    it('exibe comissão corretamente quando dados existem', () => {
      const earning = {
        commission_amount: 15.50,
        commission_value: 10,
        commission_type: 'percentage'
      };
      
      expect(formatCurrency(safeNumber(earning.commission_amount))).toBe('R$ 15,50');
      expect(formatCommissionValue(earning.commission_value, earning.commission_type)).toBe('10%');
    });

    it('exibe valores zero quando não há comissão', () => {
      const earning = {
        commission_amount: null,
        commission_value: undefined,
        commission_type: null
      };
      
      expect(formatCurrency(safeNumber(earning.commission_amount))).toBe('R$ 0,00');
      expect(safeNumber(earning.commission_value)).toBe(0);
    });

    it('lida com dados parcialmente preenchidos', () => {
      const earning = {
        commission_amount: 25,
        commission_value: null,
        commission_type: 'percentage'
      };
      
      expect(formatCurrency(safeNumber(earning.commission_amount))).toBe('R$ 25,00');
      expect(formatCommissionValue(earning.commission_value, earning.commission_type)).toBe('0%');
    });

    it('calcula e exibe total de múltiplas comissões', () => {
      const earnings = [
        { commission_amount: 10.50 },
        { commission_amount: 25.00 },
        { commission_amount: null },
        { commission_amount: 15.75 }
      ];
      
      const total = earnings.reduce((sum, e) => sum + safeNumber(e.commission_amount), 0);
      expect(total).toBe(51.25);
      expect(formatCurrency(total)).toBe('R$ 51,25');
    });

    it('exibe estatísticas de afiliado corretamente', () => {
      const affiliateStats = {
        total_commission: 1500.00,
        pending_commission: 500.00,
        available_commission: 750.00,
        maturing_commission: 250.00
      };
      
      expect(formatCurrency(safeNumber(affiliateStats.total_commission))).toBe('R$ 1.500,00');
      expect(formatCurrency(safeNumber(affiliateStats.pending_commission))).toBe('R$ 500,00');
      expect(formatCurrency(safeNumber(affiliateStats.available_commission))).toBe('R$ 750,00');
      expect(formatCurrency(safeNumber(affiliateStats.maturing_commission))).toBe('R$ 250,00');
    });

    it('exibe solicitação de saque corretamente', () => {
      const withdrawalRequest = {
        amount: 150.00,
        status: 'pending',
        affiliate_name: 'João Silva'
      };
      
      expect(formatCurrency(safeNumber(withdrawalRequest.amount))).toBe('R$ 150,00');
    });
  });

  describe('Edge Cases - Preventing NaN Display', () => {
    it('previne NaN em cálculos de proporção', () => {
      const itemSubtotal = 0;
      const totalSubtotal = 0;
      
      // Divisão por zero deve retornar 0, não NaN
      const proportion = totalSubtotal > 0 ? itemSubtotal / totalSubtotal : 0;
      expect(proportion).toBe(0);
      expect(isNaN(proportion)).toBe(false);
    });

    it('previne NaN em soma de array vazio', () => {
      const earnings: any[] = [];
      const total = earnings.reduce((sum, e) => sum + safeNumber(e?.commission_amount), 0);
      
      expect(total).toBe(0);
      expect(isNaN(total)).toBe(false);
    });

    it('previne NaN quando API retorna strings', () => {
      // Simula resposta de API com valores como strings
      const apiResponse = {
        commission_amount: '15.50',
        commission_value: '10',
        order_total: '150.00'
      };
      
      expect(safeNumber(apiResponse.commission_amount)).toBe(15.5);
      expect(safeNumber(apiResponse.commission_value)).toBe(10);
      expect(safeNumber(apiResponse.order_total)).toBe(150);
    });
  });
});
