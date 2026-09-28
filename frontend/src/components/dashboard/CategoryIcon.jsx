import React from 'react';
import {
  Utensils,
  HeartPulse,
  ShoppingCart,
  Dumbbell,
  Sparkles,
  Shield,
  CreditCard,
  Car,
  Home,
  GraduationCap,
  HelpCircle,
  Tag
} from 'lucide-react';

export default function CategoryIcon({ category = '', size = 16, color = 'currentColor', style = {} }) {
  const cat = String(category || '').toLowerCase().trim();

  if (cat.includes('aliment') || cat.includes('almoço') || cat.includes('lanche') || cat.includes('restaurante') || cat.includes('comida') || cat.includes('café') || cat.includes('bar')) {
    return <Utensils size={size} color={color} style={style} />;
  }
  if (cat.includes('saúde') || cat.includes('saude') || cat.includes('remédio') || cat.includes('farmácia') || cat.includes('dentista') || cat.includes('médic')) {
    return <HeartPulse size={size} color={color} style={style} />;
  }
  if (cat.includes('supermercado') || cat.includes('mercado') || cat.includes('compras') || cat.includes('feira')) {
    return <ShoppingCart size={size} color={color} style={style} />;
  }
  if (cat.includes('esporte') || cat.includes('jiu-jitsu') || cat.includes('academia') || cat.includes('treino') || cat.includes('fitness')) {
    return <Dumbbell size={size} color={color} style={style} />;
  }
  if (cat.includes('lazer') || cat.includes('viagem') || cat.includes('passeio') || cat.includes('cinema') || cat.includes('entretenimento')) {
    return <Sparkles size={size} color={color} style={style} />;
  }
  if (cat.includes('essencial') || cat.includes('internet') || cat.includes('celular') || cat.includes('segurança')) {
    return <Shield size={size} color={color} style={style} />;
  }
  if (cat.includes('cartão') || cat.includes('cartao') || cat.includes('fatura') || cat.includes('crédito') || cat.includes('dívida') || cat.includes('acordo')) {
    return <CreditCard size={size} color={color} style={style} />;
  }
  if (cat.includes('transporte') || cat.includes('uber') || cat.includes('combustível') || cat.includes('gasolina') || cat.includes('carro')) {
    return <Car size={size} color={color} style={style} />;
  }
  if (cat.includes('casa') || cat.includes('aluguel') || cat.includes('condomínio') || cat.includes('luz') || cat.includes('água')) {
    return <Home size={size} color={color} style={style} />;
  }
  if (cat.includes('educação') || cat.includes('curso') || cat.includes('inglês') || cat.includes('escola')) {
    return <GraduationCap size={size} color={color} style={style} />;
  }

  return <Tag size={size} color={color} style={style} />;
}
