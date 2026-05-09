'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Gift, Send, CreditCard } from 'lucide-react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { useCartStore } from '@/store/cart-store';
import { api, getImageUrl } from '@/lib/api';
import { getLocalizedName, formatCurrency } from '@/lib/utils';
import toast from 'react-hot-toast';

interface Table {
  id: number;
  number: number;
  name: string;
}

interface Category {
  id: number;
  name: Record<string, string>;
  image?: string;
}

interface Product {
  id: number;
  name: Record<string, string>;
  price: string;
  image?: string;
  category?: Category;
}

interface GiftModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GiftModal({ isOpen, onClose }: GiftModalProps) {
  const [step, setStep] = useState<'category' | 'product' | 'table' | 'confirm'>('category');
  const [tables, setTables] = useState<Table[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [sending, setSending] = useState(false);
  const { tableId, language, addItem } = useCartStore();

  const labels = {
    title: language === 'tk' ? 'Sowgat iber' : language === 'ru' ? 'Отправить подарок' : language === 'tr' ? 'Hediye gonder' : 'Send a Gift',
    selectItem: language === 'tk' ? 'Sowgat bermek ucin haryt sayla' : language === 'ru' ? 'Выберите товар для подарка' : language === 'tr' ? 'Hediye icin urun sec' : 'Select an item to send as a gift',
    selectTable: language === 'tk' ? 'Stol sayla' : language === 'ru' ? 'Выберите стол' : language === 'tr' ? 'Masa sec' : 'Select the table to send to',
    sending: language === 'tk' ? 'Iberilýar' : language === 'ru' ? 'Отправляю' : language === 'tr' ? 'Gonderiliyor' : 'Sending',
    toTable: language === 'tk' ? 'Stol' : language === 'ru' ? 'Стол' : language === 'tr' ? 'Masa' : 'Table',
    youPay: language === 'tk' ? 'Siz toleyarsiniz' : language === 'ru' ? 'Вы оплачиваете' : language === 'tr' ? 'Siz odiyorsunuz' : 'You will be charged',
    back: language === 'tk' ? 'Yza' : language === 'ru' ? 'Назад' : language === 'tr' ? 'Geri' : 'Back',
    send: language === 'tk' ? 'Iber' : language === 'ru' ? 'Отправить' : language === 'tr' ? 'Gonder' : 'Send Gift',
  };

  const categories = products.reduce<Category[]>((acc, product) => {
    if (product.category && !acc.find((c) => c.id === product.category!.id)) {
      acc.push(product.category);
    }
    return acc;
  }, []);

  const filteredProducts = selectedCategory
    ? products.filter((p) => p.category?.id === selectedCategory.id)
    : products;

  useEffect(() => {
    if (isOpen) {
      api.get<Table[]>('/tables').then(setTables);
      api.get<Product[]>('/menu/products').then(setProducts);
      setStep('category');
      setSelectedCategory(null);
      setSelectedProduct(null);
      setSelectedTable(null);
    }
  }, [isOpen]);

  const handleSendGift = () => {
    if (!selectedProduct || !selectedTable || !tableId) return;
    
    addItem({
      productId: selectedProduct.id,
      name: selectedProduct.name,
      price: parseFloat(selectedProduct.price),
      image: selectedProduct.image,
      isGift: true,
      receiverTableId: selectedTable.id,
      receiverTableNumber: selectedTable.number
    });

    toast.success(`${getLocalizedName(selectedProduct.name, language)} added to cart!`);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={
      <span className="flex items-center gap-2">
        <DotLottieReact src="/gift-animation.lottie" loop autoplay className="h-8 w-8" />
        {labels.title}
      </span>
    }>
      <div className="space-y-4">
        {/* Step 1: Category */}
        {step === 'category' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
            <p className="text-sm text-muted-foreground">{labels.selectItem}</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-[50vh] overflow-y-auto pr-1">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => { setSelectedCategory(category); setStep('product'); }}
                  className="rounded-xl overflow-hidden text-center transition-all bg-zinc-100 dark:bg-white/5 hover:bg-zinc-200 dark:hover:bg-white/10 hover:border-pink-500/30 border border-transparent"
                >
                  {category.image ? (
                    <img src={getImageUrl(category.image)} alt="" className="w-full h-20 object-cover" />
                  ) : (
                    <div className="w-full h-20 bg-zinc-200 dark:bg-white/10 flex items-center justify-center">
                      <Gift size={24} className="text-muted-foreground" />
                    </div>
                  )}
                  <div className="p-3">
                    <p className="text-sm font-semibold">
                      {getLocalizedName(category.name, language)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {products.filter((p) => p.category?.id === category.id).length} {language === 'tr' ? 'urun' : language === 'ru' ? 'товар.' : 'items'}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Step 2: Product */}
        {step === 'product' && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-3">
            {selectedCategory && (
              <p className="text-sm font-medium text-pink-400">
                {getLocalizedName(selectedCategory.name, language)}
              </p>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-[50vh] overflow-y-auto pr-1">
              {filteredProducts.map((product) => (
                <button
                  key={product.id}
                  onClick={() => { setSelectedProduct(product); setStep('table'); }}
                  className="rounded-xl overflow-hidden text-center transition-all bg-zinc-100 dark:bg-white/5 hover:bg-zinc-200 dark:hover:bg-white/10 hover:border-pink-500/30 border border-transparent flex flex-col"
                >
                  <div className="h-24 w-full bg-zinc-200 dark:bg-white/10 relative overflow-hidden shrink-0">
                    {product.image ? (
                      <img src={getImageUrl(product.image)} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Gift size={20} className="text-muted-foreground/30" />
                      </div>
                    )}
                    <div className="absolute top-2 right-2">
                      <span className="bg-white/90 dark:bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded-lg text-[10px] font-bold text-pink-500 border border-pink-500/20">
                        {formatCurrency(parseFloat(product.price))}
                      </span>
                    </div>
                  </div>
                  <div className="p-3 flex-1 flex flex-col justify-center">
                    <p className="text-xs font-bold leading-tight">
                      {getLocalizedName(product.name, language)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
            <Button variant="ghost" onClick={() => setStep('category')} className="w-full">
              {labels.back}
            </Button>
          </motion.div>
        )}

        {/* Step 2: Table */}
        {step === 'table' && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-3">
            <p className="text-sm text-muted-foreground">{labels.selectTable}</p>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 max-h-[50vh] overflow-y-auto pr-1">
              {tables
                .filter((t) => t.id !== tableId)
                .map((table) => (
                  <button
                    key={table.id}
                    onClick={() => { setSelectedTable(table); setStep('confirm'); }}
                    className="p-4 rounded-xl bg-zinc-100 dark:bg-white/5 hover:bg-zinc-200 dark:hover:bg-white/10 border border-transparent hover:border-pink-500/30 transition-all text-center"
                  >
                    <div className="w-8 h-8 rounded-full bg-pink-500/10 flex items-center justify-center mx-auto mb-2">
                      <span className="text-xs font-bold text-pink-500">{table.number}</span>
                    </div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{labels.toTable}</p>
                  </button>
                ))}
            </div>
            <Button variant="ghost" onClick={() => setStep('product')} className="w-full">
              {labels.back}
            </Button>
          </motion.div>
        )}

        {/* Step 3: Confirm */}
        {step === 'confirm' && selectedProduct && selectedTable && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            {/* Gift summary */}
            <div className="p-4 rounded-xl bg-pink-500/10 border border-pink-500/20 text-center">
              <Gift size={24} className="text-pink-400 mx-auto mb-2" />
              <p className="font-medium">
                {getLocalizedName(selectedProduct.name, language)}
              </p>
              <p className="text-sm text-muted-foreground">
                → {labels.toTable} {selectedTable.number}
              </p>
            </div>

            {/* Payment notice */}
            <div className="flex items-center gap-2 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
              <CreditCard size={16} className="text-yellow-400 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs text-yellow-400 font-medium">{labels.youPay}</p>
                <p className="text-sm font-bold text-gradient">
                  {formatCurrency(parseFloat(selectedProduct.price))}
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setStep('table')} className="flex-1">
                {labels.back}
              </Button>
              <Button onClick={handleSendGift} disabled={sending} className="flex-1 gradient-accent">
                {sending ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                ) : (
                  <Send size={16} className="mr-2" />
                )}
                {sending ? labels.sending : labels.send}
              </Button>
            </div>
          </motion.div>
        )}
      </div>
    </Modal>
  );
}
