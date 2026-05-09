"use client";

import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Edit2,
  Trash2,
  Package,
  Layers,
  ImagePlus,
  X,
  Check,
  Search,
  Eye,
  EyeOff,
  Coffee,
  Combine,
  Tag,
  DollarSign,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";

import { api, getImageUrl } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import toast from "react-hot-toast";

interface Category {
  id: number;
  name: Record<string, string>;
  image?: string;
  icon?: string;
  sortOrder: number;
  products: Product[];
}

// Preset icons living under /public/category icon/. The pill on the customer
// menu shows whichever icon the admin picks here; admins can also upload their
// own (any image goes through the same /upload endpoint as product images).
const PRESET_CATEGORY_ICONS = [
  "/category icon/hot drink.png",
  "/category icon/coffee.png",
  "/category icon/cappucino.png",
  "/category icon/tea-with-leamon.png",
  "/category icon/cola.png",
  "/category icon/bottle-drink.png",
  "/category icon/bottle.png",
  "/category icon/mohito.png",
  "/category icon/hamburger.png",
  "/category icon/pizza.png",
  "/category icon/pizza-piece.png",
  "/category icon/sandwich.png",
  "/category icon/chicken.png",
  "/category icon/ham.png",
  "/category icon/fish.png",
  "/category icon/sushi.png",
  "/category icon/fries.png",
  "/category icon/soup.png",
  "/category icon/salads.png",
  "/category icon/cake.png",
  "/category icon/dessert.png",
  "/category icon/ice-cream.png",
  "/category icon/macaron.png",
];

interface Product {
  id: number;
  name: Record<string, string>;
  price: string;
  image?: string;
  available: boolean;
  categoryId: number;
}

interface ComboItem {
  id: number;
  quantity: number;
  product: Product;
}

interface Combo {
  id: number;
  name: Record<string, string>;
  price: string;
  image?: string;
  items: ComboItem[];
}

const LANG_TABS = [
  { key: "en", label: "English", flag: "🇬🇧" },
  { key: "tr", label: "Türkçe", flag: "🇹🇷" },
  { key: "tk", label: "Türkmen", flag: "🇹🇲" },
  { key: "ru", label: "Русский", flag: "🇷🇺" },
];

export default function MenuManagementPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [combos, setCombos] = useState<Combo[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    "categories" | "products" | "combos"
  >("categories");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<
    number | null
  >(null);

  // Category form
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [catNames, setCatNames] = useState<Record<string, string>>({
    en: "",
    tr: "",
    tk: "",
    ru: "",
  });
  const [catImage, setCatImage] = useState("");
  const [catIcon, setCatIcon] = useState<string>("");
  const [catUploading, setCatUploading] = useState(false);
  const [catIconUploading, setCatIconUploading] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(
    null,
  );
  const [activeLangTab, setActiveLangTab] = useState("en");

  // Product form
  const [showProductModal, setShowProductModal] = useState(false);
  const [prodNames, setProdNames] = useState<Record<string, string>>({
    en: "",
    tr: "",
    tk: "",
    ru: "",
  });
  const [prodPrice, setProdPrice] = useState("");
  const [prodCategoryId, setProdCategoryId] = useState("");
  const [prodImage, setProdImage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [prodLangTab, setProdLangTab] = useState("en");

  // Combo form
  const [showComboModal, setShowComboModal] = useState(false);
  const [comboNames, setComboNames] = useState<Record<string, string>>({
    en: "",
    tr: "",
    tk: "",
    ru: "",
  });
  const [comboPrice, setComboPrice] = useState("");
  const [comboImage, setComboImage] = useState("");
  const [comboItems, setComboItems] = useState<
    { productId: number; quantity: number }[]
  >([]);
  const [comboUploading, setComboUploading] = useState(false);
  const [comboLangTab, setComboLangTab] = useState("en");
  const [comboSearchQuery, setComboSearchQuery] = useState("");
  const [comboCategoryFilter, setComboCategoryFilter] = useState<number | null>(
    null,
  );
  const [editingComboId, setEditingComboId] = useState<number | null>(null);

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: string;
    id: number;
    name: string;
  } | null>(null);

  const fetchMenu = async () => {
    try {
      const [data, comboData] = await Promise.all([
        api.get<Category[]>("/menu/categories"),
        api.get<Combo[]>("/menu/combos").catch(() => []),
      ]);
      setCategories(data);
      setCombos(comboData);
    } catch (error) {
      console.error("Failed to fetch menu:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMenu();
  }, []);

  const allProducts = useMemo(
    () =>
      categories.flatMap((cat) =>
        cat.products.map((p) => ({ ...p, categoryName: cat.name.en })),
      ),
    [categories],
  );

  const filteredProducts = useMemo(() => {
    let result = allProducts;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          Object.values(p.name).some((n) => n.toLowerCase().includes(q)) ||
          p.categoryName.toLowerCase().includes(q),
      );
    }
    if (selectedCategoryFilter) {
      result = result.filter((p) => p.categoryId === selectedCategoryFilter);
    }
    return result;
  }, [allProducts, searchQuery, selectedCategoryFilter]);

  const filteredCategories = useMemo(() => {
    if (!searchQuery) return categories;
    const q = searchQuery.toLowerCase();
    return categories.filter((c) =>
      Object.values(c.name).some((n) => n.toLowerCase().includes(q)),
    );
  }, [categories, searchQuery]);

  const filteredCombos = useMemo(() => {
    if (!searchQuery) return combos;
    const q = searchQuery.toLowerCase();
    return combos.filter((c) =>
      Object.values(c.name).some((n) => n.toLowerCase().includes(q)),
    );
  }, [combos, searchQuery]);

  // Category handlers
  const handleCatImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCatUploading(true);
    try {
      const data = await api.upload<{ url: string }>("/upload", file);
      setCatImage(data.url);
    } catch (error: any) {
      toast.error(error.message || "Failed to upload image");
    } finally {
      setCatUploading(false);
    }
  };

  const handleCatIconUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCatIconUploading(true);
    try {
      const data = await api.upload<{ url: string }>("/upload", file);
      setCatIcon(data.url);
      toast.success("Icon uploaded");
    } catch (error: any) {
      toast.error(error.message || "Failed to upload icon");
    } finally {
      setCatIconUploading(false);
    }
  };

  const handleSaveCategory = async () => {
    if (!catNames.en) return;
    const name = {
      en: catNames.en,
      tr: catNames.tr || catNames.en,
      tk: catNames.tk || catNames.en,
      ru: catNames.ru || catNames.en,
    };

    try {
      if (editingCategoryId) {
        await api.put(
          `/menu/categories/${editingCategoryId}`,
          {
            name,
            image: catImage || null,
            icon: catIcon || null,
          },
          true,
        );
        toast.success("Category updated");
      } else {
        await api.post(
          "/menu/categories",
          {
            name,
            image: catImage || undefined,
            icon: catIcon || undefined,
          },
          true,
        );
        toast.success("Category created");
      }
      resetCategoryForm();
      fetchMenu();
    } catch (error: any) {
      toast.error(error.message || "Failed to save category");
    }
  };

  const handleDeleteCategory = async (id: number) => {
    try {
      await api.delete(`/menu/categories/${id}`, true);
      toast.success("Category deleted");
      setDeleteConfirm(null);
      fetchMenu();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete category");
    }
  };

  const editCategory = (cat: Category) => {
    setCatNames({
      en: cat.name.en || "",
      tr: cat.name.tr || "",
      tk: cat.name.tk || "",
      ru: cat.name.ru || "",
    });
    setCatImage(cat.image || "");
    setCatIcon(cat.icon || "");
    setEditingCategoryId(cat.id);
    setActiveLangTab("en");
    setShowCategoryModal(true);
  };

  const setCategoryOrder = async (catId: number, newPosition: number) => {
    const sorted = [...categories].sort((a, b) => a.sortOrder - b.sortOrder);
    const currentIdx = sorted.findIndex((c) => c.id === catId);
    if (currentIdx < 0 || currentIdx === newPosition) return;

    // Remove the category from its current position and insert at new position
    const reordered = [...sorted];
    const [moved] = reordered.splice(currentIdx, 1);
    reordered.splice(newPosition, 0, moved);

    // Assign sequential sortOrder values
    try {
      await Promise.all(
        reordered.map((cat, i) =>
          api.put(`/menu/categories/${cat.id}`, { sortOrder: i }, true),
        ),
      );
      fetchMenu();
    } catch {
      toast.error("Failed to reorder category");
    }
  };

  const resetCategoryForm = () => {
    setCatNames({ en: "", tr: "", tk: "", ru: "" });
    setCatImage("");
    setCatIcon("");
    setEditingCategoryId(null);
    setActiveLangTab("en");
    setShowCategoryModal(false);
  };

  // Product handlers
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const data = await api.upload<{ url: string }>("/upload", file);
      setProdImage(data.url);
      toast.success("Image uploaded");
    } catch (error: any) {
      toast.error(error.message || "Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  const handleSaveProduct = async () => {
    if (!prodNames.en || !prodPrice || !prodCategoryId) return;
    const name = {
      en: prodNames.en,
      tr: prodNames.tr || prodNames.en,
      tk: prodNames.tk || prodNames.en,
      ru: prodNames.ru || prodNames.en,
    };

    try {
      if (editingProductId) {
        await api.put(
          `/menu/products/${editingProductId}`,
          {
            name,
            price: parseFloat(prodPrice),
            categoryId: parseInt(prodCategoryId),
            image: prodImage || undefined,
          },
          true,
        );
        toast.success("Product updated");
      } else {
        await api.post(
          "/menu/products",
          {
            name,
            price: parseFloat(prodPrice),
            categoryId: parseInt(prodCategoryId),
            image: prodImage || undefined,
          },
          true,
        );
        toast.success("Product created");
      }
      resetProductForm();
      fetchMenu();
    } catch (error: any) {
      toast.error(error.message || "Failed to save product");
    }
  };

  const handleDeleteProduct = async (id: number) => {
    try {
      await api.delete(`/menu/products/${id}`, true);
      toast.success("Product deleted");
      setDeleteConfirm(null);
      fetchMenu();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete product");
    }
  };

  const handleToggleAvailability = async (product: Product) => {
    try {
      await api.put(
        `/menu/products/${product.id}`,
        {
          available: !product.available,
        },
        true,
      );
      toast.success(
        product.available
          ? "Product marked unavailable"
          : "Product is now available",
      );
      fetchMenu();
    } catch (error: any) {
      toast.error(error.message || "Failed to update product");
    }
  };

  const editProduct = (prod: Product) => {
    setProdNames({
      en: prod.name.en || "",
      tr: prod.name.tr || "",
      tk: prod.name.tk || "",
      ru: prod.name.ru || "",
    });
    setProdPrice(prod.price);
    setProdImage(prod.image || "");
    setProdCategoryId(String(prod.categoryId));
    setEditingProductId(prod.id);
    setProdLangTab("en");
    setShowProductModal(true);
  };

  const resetProductForm = () => {
    setProdNames({ en: "", tr: "", tk: "", ru: "" });
    setProdPrice("");
    setProdImage("");
    setProdCategoryId("");
    setEditingProductId(null);
    setProdLangTab("en");
    setShowProductModal(false);
  };

  // Combo handlers
  const handleComboImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setComboUploading(true);
    try {
      const data = await api.upload<{ url: string }>("/upload", file);
      setComboImage(data.url);
    } catch (error: any) {
      toast.error(error.message || "Failed to upload image");
    } finally {
      setComboUploading(false);
    }
  };

  const toggleComboProduct = (productId: number) => {
    setComboItems((prev) => {
      const exists = prev.find((i) => i.productId === productId);
      if (exists) return prev.filter((i) => i.productId !== productId);
      return [...prev, { productId, quantity: 1 }];
    });
  };

  const updateComboItemQty = (productId: number, qty: number) => {
    if (qty <= 0) {
      setComboItems((prev) => prev.filter((i) => i.productId !== productId));
      return;
    }
    setComboItems((prev) =>
      prev.map((i) =>
        i.productId === productId ? { ...i, quantity: qty } : i,
      ),
    );
  };

  const handleSaveCombo = async () => {
    if (!comboNames.en || !comboPrice || comboItems.length === 0) return;
    const name = {
      en: comboNames.en,
      tr: comboNames.tr || comboNames.en,
      tk: comboNames.tk || comboNames.en,
      ru: comboNames.ru || comboNames.en,
    };
    try {
      if (editingComboId) {
        await api.put(
          `/menu/combos/${editingComboId}`,
          {
            name,
            price: parseFloat(comboPrice),
            image: comboImage || undefined,
            items: comboItems,
          },
          true,
        );
        toast.success("Combo updated");
      } else {
        await api.post(
          "/menu/combos",
          {
            name,
            price: parseFloat(comboPrice),
            image: comboImage || undefined,
            items: comboItems,
          },
          true,
        );
        toast.success("Combo created");
      }
      resetComboForm();
      fetchMenu();
    } catch (error: any) {
      toast.error(error.message || "Failed to save combo");
    }
  };

  const editCombo = (combo: Combo) => {
    setComboNames({
      en: combo.name.en || "",
      tr: combo.name.tr || "",
      tk: combo.name.tk || "",
      ru: combo.name.ru || "",
    });
    setComboPrice(combo.price);
    setComboImage(combo.image || "");
    setComboItems(
      combo.items.map((item) => ({
        productId: item.product.id,
        quantity: item.quantity,
      })),
    );
    setEditingComboId(combo.id);
    setComboLangTab("en");
    setComboSearchQuery("");
    setShowComboModal(true);
  };

  const handleDeleteCombo = async (id: number) => {
    try {
      await api.delete(`/menu/combos/${id}`, true);
      toast.success("Combo deleted");
      setDeleteConfirm(null);
      fetchMenu();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete combo");
    }
  };

  const resetComboForm = () => {
    setComboNames({ en: "", tr: "", tk: "", ru: "" });
    setComboPrice("");
    setComboImage("");
    setComboItems([]);
    setComboSearchQuery("");
    setComboCategoryFilter(null);
    setComboLangTab("en");
    setEditingComboId(null);
    setShowComboModal(false);
  };

  // Stats
  const totalProducts = allProducts.length;
  const totalCategories = categories.length;
  const totalCombos = combos.length;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-40 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10 min-w-0 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold dark:text-white">
            Menu Management
          </h1>
          <p className="text-sm text-zinc-500 font-medium mt-1">
            Manage your restaurant menu categories, products and combo sets
          </p>
        </div>
        <div className="flex gap-2">
          {activeTab === "categories" && (
            <button
              onClick={() => {
                resetCategoryForm();
                setShowCategoryModal(true);
              }}
              className="flex items-center gap-2 px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl transition-all text-sm font-bold shadow-lg shadow-orange-600/20"
            >
              <Plus size={18} />
              Add Category
            </button>
          )}
          {activeTab === "products" && (
            <button
              onClick={() => {
                resetProductForm();
                setShowProductModal(true);
              }}
              className="flex items-center gap-2 px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl transition-all text-sm font-bold shadow-lg shadow-orange-600/20"
            >
              <Plus size={18} />
              Add Product
            </button>
          )}
          {activeTab === "combos" && (
            <button
              onClick={() => {
                resetComboForm();
                setShowComboModal(true);
              }}
              className="flex items-center gap-2 px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl transition-all text-sm font-bold shadow-lg shadow-orange-600/20"
            >
              <Plus size={18} />
              Add Combo
            </button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <motion.div
          whileHover={{ y: -4 }}
          className={`rounded-2xl p-5 cursor-pointer transition-all border ${
            activeTab === "categories"
              ? "bg-white dark:bg-zinc-900 border-orange-500/50 shadow-xl shadow-orange-500/5 ring-1 ring-orange-500/20"
              : "bg-white dark:bg-zinc-900 border-black/5 dark:border-white/10 hover:border-orange-500/20"
          }`}
          onClick={() => setActiveTab("categories")}
        >
          <div className="flex items-center gap-4">
            <div
              className={`w-12 h-12 rounded-[16px] flex items-center justify-center transition-colors ${
                activeTab === "categories"
                  ? "bg-orange-600 text-white"
                  : "bg-zinc-50 dark:bg-black/20 text-zinc-400"
              }`}
            >
              <Layers size={22} />
            </div>
            <div>
              <p className="text-2xl font-black dark:text-white leading-none">
                {totalCategories}
              </p>
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">
                Categories
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          whileHover={{ y: -4 }}
          className={`rounded-2xl p-5 cursor-pointer transition-all border ${
            activeTab === "products"
              ? "bg-white dark:bg-zinc-900 border-orange-500/50 shadow-xl shadow-orange-500/5 ring-1 ring-orange-500/20"
              : "bg-white dark:bg-zinc-900 border-black/5 dark:border-white/10 hover:border-orange-500/20"
          }`}
          onClick={() => setActiveTab("products")}
        >
          <div className="flex items-center gap-4">
            <div
              className={`w-12 h-12 rounded-[16px] flex items-center justify-center transition-colors ${
                activeTab === "products"
                  ? "bg-orange-600 text-white"
                  : "bg-zinc-50 dark:bg-black/20 text-zinc-400"
              }`}
            >
              <Coffee size={22} />
            </div>
            <div>
              <p className="text-2xl font-black dark:text-white leading-none">
                {totalProducts}
              </p>
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">
                Products
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          whileHover={{ y: -4 }}
          className={`rounded-2xl p-5 cursor-pointer transition-all border ${
            activeTab === "combos"
              ? "bg-white dark:bg-zinc-900 border-orange-500/50 shadow-xl shadow-orange-500/5 ring-1 ring-orange-500/20"
              : "bg-white dark:bg-zinc-900 border-black/5 dark:border-white/10 hover:border-orange-500/20"
          }`}
          onClick={() => setActiveTab("combos")}
        >
          <div className="flex items-center gap-4">
            <div
              className={`w-12 h-12 rounded-[16px] flex items-center justify-center transition-colors ${
                activeTab === "combos"
                  ? "bg-orange-600 text-white"
                  : "bg-zinc-50 dark:bg-black/20 text-zinc-400"
              }`}
            >
              <Combine size={22} />
            </div>
            <div>
              <p className="text-2xl font-black dark:text-white leading-none">
                {totalCombos}
              </p>
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">
                Combos
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col gap-4">
        <div className="relative flex-1 group">
          <Search
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-orange-500 transition-colors"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search ${activeTab}...`}
            className="w-full pl-11 pr-12 py-3.5 rounded-[16px] bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500/50 text-sm font-medium transition-all shadow-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-zinc-100 dark:bg-white/10 text-zinc-400 hover:text-zinc-600"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {activeTab === "products" && categories.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <button
              onClick={() => setSelectedCategoryFilter(null)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                !selectedCategoryFilter
                  ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-zinc-900 dark:border-white"
                  : "bg-white dark:bg-zinc-900 text-zinc-500 border-black/5 dark:border-white/10 hover:bg-zinc-50"
              }`}
            >
              All Items
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() =>
                  setSelectedCategoryFilter(
                    selectedCategoryFilter === cat.id ? null : cat.id,
                  )
                }
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                  selectedCategoryFilter === cat.id
                    ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-zinc-900 dark:border-white"
                    : "bg-white dark:bg-zinc-900 text-zinc-500 border-black/5 dark:border-white/10 hover:bg-zinc-50"
                }`}
              >
                {cat.name.en}
                <span className={`ml-1.5 opacity-60 text-[10px]`}>
                  ({cat.products.length})
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ==================== CATEGORIES VIEW ==================== */}
      <AnimatePresence mode="wait">
        {activeTab === "categories" && (
          <motion.div
            key="categories"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {filteredCategories.length === 0 ? (
              <EmptyState
                icon={<Layers size={48} className="text-orange-400/50" />}
                title={
                  searchQuery ? "No categories found" : "No categories yet"
                }
                description={
                  searchQuery
                    ? "Try a different search term"
                    : "Create your first category to organize your menu"
                }
                action={
                  !searchQuery ? (
                    <button
                      onClick={() => {
                        resetCategoryForm();
                        setShowCategoryModal(true);
                      }}
                      className="flex items-center gap-2 px-5 py-2.5 bg-orange-600 text-white rounded-xl font-bold text-sm"
                    >
                      <Plus size={16} /> Create Category
                    </button>
                  ) : undefined
                }
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCategories.map((cat, index) => (
                  <motion.div
                    key={cat.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.04 }}
                    layout
                    className="group"
                  >
                    <div className="bg-white dark:bg-zinc-900 rounded-[24px] border border-black/5 dark:border-white/10 shadow-sm hover:shadow-xl hover:shadow-black/5 transition-all overflow-hidden relative">
                      {/* Category Image */}
                      <div className="relative h-40 overflow-hidden bg-zinc-50 dark:bg-black/20">
                        {cat.image ? (
                          <img
                            src={getImageUrl(cat.image)}
                            alt={cat.name.en}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-zinc-200 dark:text-zinc-800">
                            <Layers size={48} />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80" />
                        <div className="absolute bottom-4 left-5">
                          <h3 className="font-bold text-white text-xl drop-shadow-md">
                            {cat.name.en}
                          </h3>
                          <p className="text-white/80 text-[10px] font-bold uppercase tracking-widest mt-1">
                            {cat.products.length}{" "}
                            {cat.products.length === 1 ? "item" : "items"}
                          </p>
                        </div>

                        {/* Sort Order Dropdown */}
                        <div className="absolute top-4 left-4">
                          <select
                            value={index}
                            onChange={(e) => {
                              e.stopPropagation();
                              setCategoryOrder(cat.id, parseInt(e.target.value));
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="appearance-none bg-black/50 backdrop-blur-md text-white text-[11px] font-bold rounded-lg pl-2 pr-6 py-1 border border-white/20 cursor-pointer hover:bg-black/70 transition-colors focus:outline-none focus:ring-2 focus:ring-white/30"
                            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='white' viewBox='0 0 24 24'%3E%3Cpath d='M7 10l5 5 5-5z'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 4px center' }}
                          >
                            {filteredCategories.map((_, i) => (
                              <option key={i} value={i} className="bg-zinc-900 text-white">
                                #{i + 1}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Actions Overlay */}
                        <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-all translate-y-[-10px] group-hover:translate-y-0">
                          <button
                            onClick={() => editCategory(cat)}
                            className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white flex items-center justify-center hover:bg-white/40 transition-colors"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() =>
                              setDeleteConfirm({
                                type: "category",
                                id: cat.id,
                                name: cat.name.en,
                              })
                            }
                            className="w-9 h-9 rounded-full bg-red-500/80 backdrop-blur-md border border-red-400 text-white flex items-center justify-center hover:bg-red-600 transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>

                      <div className="p-5">
                        {/* Language badges */}
                        <div className="flex flex-wrap gap-1.5">
                          {LANG_TABS.map(({ key, flag }) => {
                            const val = cat.name[key];
                            if (!val || val === cat.name.en) return null;
                            return (
                              <span
                                key={key}
                                className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-1 rounded-lg bg-zinc-50 dark:bg-white/5 text-zinc-400 border border-black/5 dark:border-white/5"
                              >
                                <span className="text-[12px] grayscale-[0.5]">
                                  {flag}
                                </span>{" "}
                                {val}
                              </span>
                            );
                          })}
                        </div>

                        {/* Product thumbnails */}
                        {cat.products.length > 0 && (
                          <div className="flex items-center gap-3 mt-5 pt-5 border-t border-black/5 dark:border-white/5">
                            <div className="flex -space-x-3">
                              {cat.products.slice(0, 4).map((p) => (
                                <div
                                  key={p.id}
                                  className="w-8 h-8 rounded-full border-2 border-white dark:border-zinc-900 bg-zinc-100 dark:bg-black overflow-hidden shadow-sm"
                                >
                                  {p.image ? (
                                    <img
                                      src={getImageUrl(p.image)}
                                      alt=""
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                      <Package
                                        size={12}
                                        className="text-zinc-400"
                                      />
                                    </div>
                                  )}
                                </div>
                              ))}
                              {cat.products.length > 4 && (
                                <div className="w-8 h-8 rounded-full border-2 border-white dark:border-zinc-900 bg-orange-600 text-white flex items-center justify-center text-[10px] font-bold shadow-sm">
                                  +{cat.products.length - 4}
                                </div>
                              )}
                            </div>
                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                              Menu Items
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* ==================== PRODUCTS VIEW ==================== */}
        {activeTab === "products" && (
          <motion.div
            key="products"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {filteredProducts.length === 0 ? (
              <EmptyState
                icon={<Coffee size={48} className="text-orange-400/50" />}
                title={
                  searchQuery || selectedCategoryFilter
                    ? "No products found"
                    : "No products yet"
                }
                description={
                  searchQuery || selectedCategoryFilter
                    ? "Try a different search or filter"
                    : "Add your first product to start building your menu"
                }
                action={
                  !searchQuery && !selectedCategoryFilter ? (
                    <button
                      onClick={() => {
                        resetProductForm();
                        setShowProductModal(true);
                      }}
                      className="flex items-center gap-2 px-5 py-2.5 bg-orange-600 text-white rounded-xl font-bold text-sm"
                    >
                      <Plus size={16} /> Add Product
                    </button>
                  ) : undefined
                }
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 min-w-0">
                {filteredProducts.map((product, index) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    layout
                    className="group"
                  >
                    <div
                      className={`bg-white dark:bg-zinc-900 rounded-[24px] border border-black/5 dark:border-white/10 shadow-sm hover:shadow-xl transition-all overflow-hidden ${
                        !product.available ? "opacity-70 grayscale-[0.3]" : ""
                      }`}
                    >
                      {/* Product Image */}
                      <div className="relative h-48 bg-zinc-50 dark:bg-black/20 overflow-hidden">
                        {product.image ? (
                          <img
                            src={getImageUrl(product.image)}
                            alt={product.name.en}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-zinc-200 dark:text-zinc-800">
                            <Package size={40} />
                          </div>
                        )}

                        {/* Overlay Actions */}
                        <div className="absolute top-4 right-4 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all translate-x-[10px] group-hover:translate-x-0">
                          <button
                            onClick={() => editProduct(product)}
                            className="w-9 h-9 rounded-full bg-white dark:bg-zinc-800 shadow-xl border border-black/5 dark:border-white/10 flex items-center justify-center text-zinc-600 dark:text-white hover:bg-orange-600 hover:text-white hover:border-orange-600 transition-all"
                            title="Edit"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            onClick={() =>
                              setDeleteConfirm({
                                type: "product",
                                id: product.id,
                                name: product.name.en,
                              })
                            }
                            className="w-9 h-9 rounded-full bg-white dark:bg-zinc-800 shadow-xl border border-black/5 dark:border-white/10 flex items-center justify-center text-red-500 hover:bg-red-500 hover:text-white hover:border-red-500 transition-all"
                            title="Delete"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>

                        {/* Availability Toggle overlay */}
                        <div className="absolute bottom-4 left-4">
                          <button
                            onClick={() => handleToggleAvailability(product)}
                            className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest backdrop-blur-md border flex items-center gap-2 transition-all ${
                              product.available
                                ? "bg-emerald-500/80 border-emerald-400 text-white"
                                : "bg-red-500/80 border-red-400 text-white"
                            }`}
                          >
                            {product.available ? (
                              <Eye size={12} />
                            ) : (
                              <EyeOff size={12} />
                            )}
                            {product.available ? "Available" : "Hidden"}
                          </button>
                        </div>

                        {/* Category Label */}
                        <div className="absolute top-4 left-4">
                          <span className="px-3 py-1 bg-black/40 backdrop-blur-md border border-white/20 text-white text-[10px] font-bold rounded-full uppercase tracking-widest">
                            {product.categoryName}
                          </span>
                        </div>
                      </div>

                      {/* Product Info */}
                      <div className="p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <h3 className="font-bold text-base truncate dark:text-white">
                              {product.name.en}
                            </h3>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {LANG_TABS.slice(1).map(({ key, flag }) => {
                                const val = product.name[key];
                                if (!val || val === product.name.en)
                                  return null;
                                return (
                                  <span
                                    key={key}
                                    className="text-[10px] text-zinc-400 font-medium"
                                  >
                                    {flag}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-black text-orange-600 dark:text-orange-400 leading-none">
                              {formatCurrency(parseFloat(product.price))}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* ==================== COMBOS VIEW ==================== */}
        {activeTab === "combos" && (
          <motion.div
            key="combos"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {filteredCombos.length === 0 ? (
              <EmptyState
                icon={<Combine size={48} className="text-orange-400/50" />}
                title={searchQuery ? "No combos found" : "No combo sets yet"}
                description={
                  searchQuery
                    ? "Try a different search term"
                    : "Create combo deals to offer special set menus"
                }
                action={
                  !searchQuery ? (
                    <button
                      onClick={() => {
                        resetComboForm();
                        setShowComboModal(true);
                      }}
                      className="flex items-center gap-2 px-5 py-2.5 bg-orange-600 text-white rounded-xl font-bold text-sm"
                    >
                      <Plus size={16} /> Create Combo
                    </button>
                  ) : undefined
                }
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCombos.map((combo, index) => (
                  <motion.div
                    key={combo.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.04 }}
                    layout
                    className="group"
                  >
                    <div className="bg-white dark:bg-zinc-900 rounded-[24px] border border-black/5 dark:border-white/10 shadow-sm hover:shadow-xl transition-all overflow-hidden">
                      {/* Combo Header with Image */}
                      <div className="relative h-48 bg-zinc-50 dark:bg-black/20 overflow-hidden">
                        {combo.image ? (
                          <img
                            src={getImageUrl(combo.image)}
                            alt={combo.name.en}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-zinc-200 dark:text-zinc-800">
                            <Combine size={48} />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80" />

                        {/* Overlay Actions */}
                        <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-all translate-y-[-10px] group-hover:translate-y-0">
                          <button
                            onClick={() => editCombo(combo)}
                            className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white flex items-center justify-center hover:bg-white/40 transition-colors"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() =>
                              setDeleteConfirm({
                                type: "combo",
                                id: combo.id,
                                name: combo.name.en,
                              })
                            }
                            className="w-9 h-9 rounded-full bg-red-500/80 backdrop-blur-md border border-red-400 text-white flex items-center justify-center hover:bg-red-600 transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>

                        {/* Title & Price on Image */}
                        <div className="absolute bottom-4 left-5 right-5 flex items-end justify-between">
                          <div>
                            <h3 className="font-bold text-white text-xl drop-shadow-md">
                              {combo.name.en}
                            </h3>
                            <p className="text-white/80 text-[10px] font-bold uppercase tracking-widest mt-1">
                              {combo.items.length}{" "}
                              {combo.items.length === 1 ? "item" : "items"} set
                            </p>
                          </div>
                          <span className="px-3 py-1.5 rounded-xl bg-orange-600 text-white text-sm font-black shadow-lg">
                            {formatCurrency(parseFloat(combo.price))}
                          </span>
                        </div>
                      </div>

                      {/* Combo Items */}
                      <div className="p-5">
                        <div className="space-y-2 mb-4">
                          {combo.items.map((item) => (
                            <div
                              key={item.id}
                              className="flex items-center gap-3 bg-zinc-50 dark:bg-black/20 p-2 rounded-xl border border-black/5 dark:border-white/5"
                            >
                              <div className="w-8 h-8 rounded-lg bg-white dark:bg-zinc-800 overflow-hidden flex items-center justify-center shadow-sm">
                                {item.product.image ? (
                                  <img
                                    src={getImageUrl(item.product.image)}
                                    alt=""
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <Package
                                    size={14}
                                    className="text-zinc-400"
                                  />
                                )}
                              </div>
                              <span className="text-sm font-bold flex-1 truncate dark:text-white">
                                {item.product.name.en ||
                                  Object.values(item.product.name)[0]}
                              </span>
                              <span className="text-[10px] font-black text-orange-600 bg-orange-50 dark:bg-orange-500/10 px-2 py-0.5 rounded-full border border-orange-100 dark:border-orange-500/20">
                                x{item.quantity}
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* Savings indicator */}
                        {(() => {
                          const totalIndividual = combo.items.reduce(
                            (sum, item) =>
                              sum +
                              parseFloat(item.product.price) * item.quantity,
                            0,
                          );
                          const savings =
                            totalIndividual - parseFloat(combo.price);
                          if (savings > 0) {
                            return (
                              <div className="pt-4 border-t border-black/5 dark:border-white/5 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
                                    <Tag
                                      size={12}
                                      className="text-emerald-500"
                                    />
                                  </div>
                                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-widest">
                                    Save {formatCurrency(savings)}
                                  </span>
                                </div>
                                <span className="text-[10px] text-zinc-400 font-medium italic">
                                  Worth {formatCurrency(totalIndividual)}
                                </span>
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ==================== DELETE CONFIRMATION MODAL ==================== */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Confirm Delete"
      >
        <div className="space-y-6">
          <div className="flex items-start gap-4 p-6 rounded-[24px] bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20">
            <div className="w-12 h-12 rounded-2xl bg-red-500 text-white flex items-center justify-center shrink-0 shadow-lg shadow-red-500/20">
              <AlertCircle size={24} />
            </div>
            <div>
              <p className="text-sm font-bold text-zinc-900 dark:text-white">
                Are you sure you want to delete{" "}
                <span className="text-red-500">"{deleteConfirm?.name}"</span>?
              </p>
              {deleteConfirm?.type === "category" && (
                <p className="text-xs text-zinc-500 font-medium mt-2 leading-relaxed">
                  Warning: This action will also permanently delete all products
                  associated with this category.
                </p>
              )}
              <p className="text-xs text-zinc-500 font-medium mt-2">
                This action cannot be undone.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              className="flex-1 py-4 px-6 rounded-2xl bg-zinc-100 dark:bg-white/5 text-zinc-600 dark:text-zinc-400 font-black text-sm uppercase tracking-widest hover:bg-zinc-200 dark:hover:bg-white/10 transition-all"
              onClick={() => setDeleteConfirm(null)}
            >
              Cancel
            </button>
            <button
              className="flex-1 py-4 px-6 rounded-2xl bg-red-600 text-white font-black text-sm uppercase tracking-widest hover:bg-red-700 shadow-xl shadow-red-600/20 transition-all"
              onClick={() => {
                if (!deleteConfirm) return;
                if (deleteConfirm.type === "category")
                  handleDeleteCategory(deleteConfirm.id);
                else if (deleteConfirm.type === "product")
                  handleDeleteProduct(deleteConfirm.id);
                else if (deleteConfirm.type === "combo")
                  handleDeleteCombo(deleteConfirm.id);
              }}
            >
              Delete
            </button>
          </div>
        </div>
      </Modal>

      {/* ==================== CATEGORY MODAL ==================== */}
      <Modal
        isOpen={showCategoryModal}
        onClose={resetCategoryForm}
        title={editingCategoryId ? "Edit Category" : "New Category"}
      >
        <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-4">
          {/* Language tabs */}
          <div className="flex gap-2 p-1.5 bg-zinc-50 dark:bg-black/20 rounded-2xl border border-black/5 dark:border-white/5">
            {LANG_TABS.map(({ key, label, flag }) => (
              <button
                key={key}
                onClick={() => setActiveLangTab(key)}
                className={`flex-1 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                  activeLangTab === key
                    ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-md"
                    : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                }`}
              >
                <span className="text-sm grayscale-[0.5]">{flag}</span>
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>

          {/* Name input for active language */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.1em] text-zinc-400 px-1">
              Category Name (
              {LANG_TABS.find((l) => l.key === activeLangTab)?.label})
              {activeLangTab === "en" && (
                <span className="text-orange-500 ml-1 text-xs">*</span>
              )}
            </label>
            <input
              type="text"
              value={catNames[activeLangTab] || ""}
              onChange={(e) =>
                setCatNames({ ...catNames, [activeLangTab]: e.target.value })
              }
              placeholder={
                activeLangTab === "en"
                  ? "e.g., Hot Drinks"
                  : `Translation in ${LANG_TABS.find((l) => l.key === activeLangTab)?.label}`
              }
              className="w-full px-5 py-4 rounded-2xl bg-zinc-50 dark:bg-black/20 border border-black/5 dark:border-white/5 focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500/40 text-sm font-bold transition-all"
            />
            {/* Show filled languages indicator */}
            <div className="flex flex-wrap gap-2 mt-2 px-1">
              {LANG_TABS.map(({ key, flag }) => (
                <div
                  key={key}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                    catNames[key]
                      ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20 text-emerald-600"
                      : "bg-zinc-50 dark:bg-white/5 border-black/5 dark:border-white/5 text-zinc-300"
                  }`}
                >
                  <span className={catNames[key] ? "grayscale-0" : "grayscale"}>
                    {flag}
                  </span>
                  {catNames[key] ? "Complete" : "Empty"}
                </div>
              ))}
            </div>
          </div>

          {/* Category Image */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.1em] text-zinc-400 px-1">
              Cover Image (optional)
            </label>
            {catImage ? (
              <div className="relative w-full h-40 rounded-[24px] overflow-hidden group shadow-lg">
                <img
                  src={getImageUrl(catImage)}
                  alt=""
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button
                    onClick={() => setCatImage("")}
                    className="w-10 h-10 rounded-full bg-red-500 text-white flex items-center justify-center shadow-xl hover:bg-red-600 transition-all scale-90 group-hover:scale-100"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-40 rounded-[24px] border-2 border-dashed border-black/10 dark:border-white/10 hover:border-orange-500/40 hover:bg-orange-500/5 cursor-pointer transition-all group">
                {catUploading ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-orange-500 animate-pulse">
                      Uploading...
                    </span>
                  </div>
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-2xl bg-zinc-50 dark:bg-white/5 flex items-center justify-center text-zinc-400 group-hover:text-orange-500 transition-colors mb-3">
                      <ImagePlus size={24} />
                    </div>
                    <span className="text-xs font-bold text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-200 transition-colors">
                      Drop your cover image here
                    </span>
                    <span className="text-[10px] font-medium text-zinc-300 mt-1 uppercase tracking-[0.1em]">
                      JPEG, PNG (MAX. 2MB)
                    </span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleCatImageUpload}
                  className="hidden"
                  disabled={catUploading}
                />
              </label>
            )}
          </div>

          {/* Category Pill Icon — small icon next to the name on the customer menu */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <label className="text-[10px] font-black uppercase tracking-[0.1em] text-zinc-400">
                Pill Icon
              </label>
              {catIcon && (
                <button
                  type="button"
                  onClick={() => setCatIcon("")}
                  className="text-[10px] font-bold uppercase tracking-widest text-red-500 hover:text-red-600 transition-colors flex items-center gap-1"
                >
                  <X size={11} /> Clear
                </button>
              )}
            </div>

            {/* Live preview of the customer-side pill */}
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-zinc-50 dark:bg-black/20 border border-black/5 dark:border-white/5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                Preview:
              </span>
              <div className="relative flex items-center gap-2 pr-5 pl-1.5 py-1.5 rounded-full bg-orange-500 text-white text-sm font-bold shadow-md shadow-orange-500/30">
                <div className="w-7 h-7 rounded-full bg-white shadow-sm flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {catIcon ? (
                    <img
                      src={getImageUrl(catIcon)}
                      alt=""
                      className="w-5 h-5 object-contain"
                    />
                  ) : (
                    <span className="text-base">🍽️</span>
                  )}
                </div>
                <span>{catNames.en || "Category"}</span>
              </div>
            </div>

            {/* Preset grid */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-2 px-1">
                Pick a preset
              </p>
              <div className="grid grid-cols-6 sm:grid-cols-8 gap-2 p-3 rounded-2xl bg-zinc-50 dark:bg-black/20 border border-black/5 dark:border-white/5">
                {PRESET_CATEGORY_ICONS.map((path) => {
                  const isSelected = catIcon === path;
                  return (
                    <button
                      key={path}
                      type="button"
                      onClick={() => setCatIcon(path)}
                      className={`relative aspect-square rounded-xl flex items-center justify-center transition-all ${
                        isSelected
                          ? "bg-orange-500 ring-2 ring-orange-500 ring-offset-2 ring-offset-zinc-50 dark:ring-offset-zinc-900 shadow-lg shadow-orange-500/30"
                          : "bg-white dark:bg-white/5 hover:bg-orange-50 dark:hover:bg-orange-500/10 hover:scale-105"
                      }`}
                    >
                      <img
                        src={path}
                        alt=""
                        className="w-6 h-6 sm:w-7 sm:h-7 object-contain"
                      />
                      {isSelected && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center shadow-md">
                          <Check
                            size={10}
                            className="text-white"
                            strokeWidth={3}
                          />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom upload */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-2 px-1">
                Or upload your own
              </p>
              <label className="flex items-center gap-3 p-3 rounded-2xl border-2 border-dashed border-black/10 dark:border-white/10 hover:border-orange-500/40 hover:bg-orange-500/5 cursor-pointer transition-all group">
                <div className="w-10 h-10 rounded-xl bg-white dark:bg-white/5 flex items-center justify-center text-zinc-400 group-hover:text-orange-500 transition-colors flex-shrink-0">
                  {catIconUploading ? (
                    <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <ImagePlus size={18} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-zinc-600 dark:text-zinc-200">
                    {catIconUploading ? "Uploading..." : "Upload custom icon"}
                  </p>
                  <p className="text-[10px] text-zinc-400 mt-0.5">
                    PNG / SVG with transparent background works best
                  </p>
                </div>
                <input
                  type="file"
                  accept="image/png,image/svg+xml,image/jpeg,image/webp"
                  onChange={handleCatIconUpload}
                  className="hidden"
                  disabled={catIconUploading}
                />
              </label>
            </div>
          </div>

          <div className="pt-4">
            <button
              onClick={handleSaveCategory}
              className="w-full py-4 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-orange-600/20 transition-all disabled:opacity-50 disabled:shadow-none"
              disabled={!catNames.en}
            >
              {editingCategoryId ? "Update Category" : "Create Category"}
            </button>
          </div>
        </div>
      </Modal>

      {/* ==================== PRODUCT MODAL ==================== */}
      <Modal
        isOpen={showProductModal}
        onClose={resetProductForm}
        title={editingProductId ? "Edit Product" : "New Product"}
      >
        <div className="space-y-6 max-h-[70vh]  overflow-y-auto pr-4">
          {/* Product Image - at the top for visual impact */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.1em] text-zinc-400 px-1">
              Product Photo
            </label>
            {prodImage ? (
              <div className="relative w-full h-48 rounded-[28px] overflow-hidden group shadow-lg">
                <img
                  src={getImageUrl(prodImage)}
                  alt="Preview"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button
                    onClick={() => setProdImage("")}
                    className="w-10 h-10 rounded-full bg-red-500 text-white flex items-center justify-center shadow-xl hover:bg-red-600 transition-all scale-90 group-hover:scale-100"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-48 rounded-[28px] border-2 border-dashed border-black/10 dark:border-white/10 hover:border-orange-500/40 hover:bg-orange-500/5 cursor-pointer transition-all group">
                {uploading ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-orange-500 animate-pulse">
                      Uploading...
                    </span>
                  </div>
                ) : (
                  <>
                    <div className="w-14 h-14 rounded-2xl bg-zinc-50 dark:bg-white/5 flex items-center justify-center text-zinc-400 group-hover:text-orange-500 transition-colors mb-3">
                      <ImagePlus size={28} />
                    </div>
                    <span className="text-sm font-bold text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-200 transition-colors">
                      Select product image
                    </span>
                    <span className="text-[10px] font-medium text-zinc-300 mt-1 uppercase tracking-[0.1em]">
                      Optimal: 800x800px
                    </span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
            )}
          </div>

          {/* Language tabs */}
          <div className="flex gap-2 p-1.5 bg-zinc-50 dark:bg-black/20 rounded-2xl border border-black/5 dark:border-white/5">
            {LANG_TABS.map(({ key, label, flag }) => (
              <button
                key={key}
                onClick={() => setProdLangTab(key)}
                className={`flex-1 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                  prodLangTab === key
                    ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-md"
                    : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                }`}
              >
                <span className="text-sm grayscale-[0.5]">{flag}</span>
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>

          {/* Name input */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.1em] text-zinc-400 px-1">
              Product Name (
              {LANG_TABS.find((l) => l.key === prodLangTab)?.label})
              {prodLangTab === "en" && (
                <span className="text-orange-500 ml-1 text-xs">*</span>
              )}
            </label>
            <input
              type="text"
              value={prodNames[prodLangTab] || ""}
              onChange={(e) =>
                setProdNames({ ...prodNames, [prodLangTab]: e.target.value })
              }
              placeholder={
                prodLangTab === "en" ? "e.g., Turkish Coffee" : `Translation...`
              }
              className="w-full px-5 py-4 rounded-2xl bg-zinc-50 dark:bg-black/20 border border-black/5 dark:border-white/5 focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500/40 text-sm font-bold transition-all"
            />
            <div className="flex flex-wrap gap-2 mt-2 px-1">
              {LANG_TABS.map(({ key, flag }) => (
                <div
                  key={key}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                    prodNames[key]
                      ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20 text-emerald-600"
                      : "bg-zinc-50 dark:bg-white/5 border-black/5 dark:border-white/5 text-zinc-300"
                  }`}
                >
                  <span
                    className={prodNames[key] ? "grayscale-0" : "grayscale"}
                  >
                    {flag}
                  </span>
                  {prodNames[key] ? "Complete" : "Empty"}
                </div>
              ))}
            </div>
          </div>

          {/* Price & Category side by side */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.1em] text-zinc-400 px-1">
                Price <span className="text-orange-500 ml-1 text-xs">*</span>
              </label>
              <div className="relative group">
                <div className="absolute right-5 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-orange-500 transition-colors font-bold text-xs">
                  TMT
                </div>
                <input
                  type="number"
                  step="0.01"
                  value={prodPrice}
                  onChange={(e) => setProdPrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-5 pr-14 py-4 rounded-2xl bg-zinc-50 dark:bg-black/20 border border-black/5 dark:border-white/5 focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500/40 text-sm font-bold transition-all"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.1em] text-zinc-400 px-1">
                Category <span className="text-orange-500 ml-1 text-xs">*</span>
              </label>
              <select
                value={prodCategoryId}
                onChange={(e) => setProdCategoryId(e.target.value)}
                className="w-full px-5 py-4 rounded-2xl bg-zinc-50 dark:bg-black/20 border border-black/5 dark:border-white/5 focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500/40 text-sm font-bold transition-all appearance-none cursor-pointer"
              >
                <option value="">Select category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name.en}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-4">
            <button
              onClick={handleSaveProduct}
              className="w-full py-4 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-orange-600/20 transition-all disabled:opacity-50 disabled:shadow-none"
              disabled={!prodNames.en || !prodPrice || !prodCategoryId}
            >
              {editingProductId ? "Update Product" : "Create Product"}
            </button>
          </div>
        </div>
      </Modal>

      {/* ==================== COMBO MODAL ==================== */}
      <Modal
        isOpen={showComboModal}
        onClose={resetComboForm}
        title={editingComboId ? "Edit Combo Set" : "Create Combo Set"}
      >
        <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-4">
          {/* Combo Image */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.1em] text-zinc-400 px-1">
              Combo Banner
            </label>
            {comboImage ? (
              <div className="relative w-full h-40 rounded-[24px] overflow-hidden group shadow-lg">
                <img
                  src={getImageUrl(comboImage)}
                  alt=""
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button
                    onClick={() => setComboImage("")}
                    className="w-10 h-10 rounded-full bg-red-500 text-white flex items-center justify-center shadow-xl hover:bg-red-600 transition-all scale-90 group-hover:scale-100"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-40 rounded-[24px] border-2 border-dashed border-black/10 dark:border-white/10 hover:border-orange-500/40 hover:bg-orange-500/5 cursor-pointer transition-all group">
                {comboUploading ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-orange-500 animate-pulse">
                      Uploading...
                    </span>
                  </div>
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-2xl bg-zinc-50 dark:bg-white/5 flex items-center justify-center text-zinc-400 group-hover:text-orange-500 transition-colors mb-3">
                      <ImagePlus size={24} />
                    </div>
                    <span className="text-xs font-bold text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-200 transition-colors text-center px-4">
                      Upload combo cover image
                    </span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleComboImageUpload}
                  className="hidden"
                  disabled={comboUploading}
                />
              </label>
            )}
          </div>

          {/* Language tabs */}
          <div className="flex gap-2 p-1.5 bg-zinc-50 dark:bg-black/20 rounded-2xl border border-black/5 dark:border-white/5">
            {LANG_TABS.map(({ key, label, flag }) => (
              <button
                key={key}
                onClick={() => setComboLangTab(key)}
                className={`flex-1 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                  comboLangTab === key
                    ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-md"
                    : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                }`}
              >
                <span className="text-sm grayscale-[0.5]">{flag}</span>
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>

          {/* Name input */}

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.1em] text-zinc-400 px-1">
              Combo Name ({LANG_TABS.find((l) => l.key === comboLangTab)?.label}
              )
              {comboLangTab === "en" && (
                <span className="text-orange-500 ml-1 text-xs">*</span>
              )}
            </label>
            <input
              type="text"
              value={comboNames[comboLangTab] || ""}
              onChange={(e) =>
                setComboNames({ ...comboNames, [comboLangTab]: e.target.value })
              }
              placeholder={
                comboLangTab === "en" ? "e.g., Breakfast Set" : `Translation...`
              }
              className="w-full px-5 py-4 rounded-2xl bg-zinc-50 dark:bg-black/20 border border-black/5 dark:border-white/5 focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500/40 text-sm font-bold transition-all"
            />
          </div>

          {/* Price */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.1em] text-zinc-400 px-1">
              Set Price <span className="text-orange-500 ml-1 text-xs">*</span>
            </label>
            <div className="relative group">
              <div className="absolute right-5 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-orange-500 transition-colors font-bold text-xs">
                TMT
              </div>
              <input
                type="number"
                step="0.01"
                value={comboPrice}
                onChange={(e) => setComboPrice(e.target.value)}
                placeholder="0.00"
                className="w-full pl-5 pr-14 py-4 rounded-2xl bg-zinc-50 dark:bg-black/20 border border-black/5 dark:border-white/5 focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500/40 text-sm font-bold transition-all"
              />
            </div>
          </div>

          {/* Product Selection */}
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-[0.1em] text-zinc-400 px-1 flex items-center justify-between">
              Select Included Products{" "}
              <span className="text-orange-500 ml-1 text-xs">*</span>
              {comboItems.length > 0 && (
                <span className="text-[10px] font-black text-orange-600 bg-orange-50 dark:bg-orange-500/10 px-2 py-0.5 rounded-full border border-orange-100 dark:border-orange-500/20">
                  {comboItems.length} selected
                </span>
              )}
            </label>

            {/* Search within products */}
            <div className="relative group">
              <Search
                size={16}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-orange-500 transition-colors"
              />
              <input
                type="text"
                value={comboSearchQuery}
                onChange={(e) => setComboSearchQuery(e.target.value)}
                placeholder="Search products to add..."
                className="w-full pl-11 pr-5 py-3 rounded-xl bg-zinc-50 dark:bg-black/20 border border-black/5 dark:border-white/5 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500/40 text-sm font-medium transition-all"
              />
            </div>

            {/* Category filter chips */}
            {categories.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                <button
                  onClick={() => setComboCategoryFilter(null)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border ${
                    !comboCategoryFilter
                      ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-zinc-900 dark:border-white"
                      : "bg-white dark:bg-zinc-950 text-zinc-500 border-black/5 dark:border-white/10 hover:bg-zinc-50"
                  }`}
                >
                  All
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() =>
                      setComboCategoryFilter(
                        comboCategoryFilter === cat.id ? null : cat.id,
                      )
                    }
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border ${
                      comboCategoryFilter === cat.id
                        ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-zinc-900 dark:border-white"
                        : "bg-white dark:bg-zinc-950 text-zinc-500 border-black/5 dark:border-white/10 hover:bg-zinc-50"
                    }`}
                  >
                    {cat.name.en}
                  </button>
                ))}
              </div>
            )}

            <div className="max-h-56 overflow-y-auto space-y-1 bg-zinc-50 dark:bg-black/20 rounded-[20px] p-2 border border-black/5 dark:border-white/5">
              {allProducts
                .filter((p) => {
                  let match = true;
                  if (comboCategoryFilter) {
                    match = p.categoryId === comboCategoryFilter;
                  }
                  if (match && comboSearchQuery) {
                    const q = comboSearchQuery.toLowerCase();
                    match =
                      Object.values(p.name).some((n) =>
                        n.toLowerCase().includes(q),
                      ) || p.categoryName.toLowerCase().includes(q);
                  }
                  return match;
                })
                .map((product) => {
                  const selected = comboItems.find(
                    (i) => i.productId === product.id,
                  );
                  return (
                    <div
                      key={product.id}
                      className={`flex items-center gap-3 p-2 rounded-xl transition-all ${
                        selected
                          ? "bg-orange-500/10 border border-orange-500/20 shadow-sm"
                          : "hover:bg-white dark:hover:bg-white/5"
                      }`}
                    >
                      <button
                        onClick={() => toggleComboProduct(product.id)}
                        className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-all ${
                          selected
                            ? "bg-orange-600 shadow-md"
                            : "border-2 border-black/5 dark:border-white/10 bg-white dark:bg-zinc-800"
                        }`}
                      >
                        {selected && (
                          <Check
                            size={14}
                            className="text-white"
                            strokeWidth={3}
                          />
                        )}
                      </button>
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-white dark:bg-zinc-800 flex items-center justify-center shrink-0 shadow-sm">
                        {product.image ? (
                          <img
                            src={getImageUrl(product.image)}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Package size={16} className="text-zinc-300" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate dark:text-white">
                          {product.name.en}
                        </p>
                        <p className="text-[10px] font-bold text-orange-600">
                          {formatCurrency(parseFloat(product.price))}
                        </p>
                      </div>
                      {selected && (
                        <div className="flex items-center gap-1 bg-white dark:bg-zinc-900 p-1 rounded-lg border border-black/5 dark:border-white/5 shadow-sm">
                          <button
                            onClick={() =>
                              updateComboItemQty(
                                product.id,
                                selected.quantity - 1,
                              )
                            }
                            className="w-7 h-7 rounded-md bg-zinc-50 dark:bg-white/5 hover:bg-zinc-100 dark:hover:bg-white/10 flex items-center justify-center text-zinc-500 dark:text-white transition-colors"
                          >
                            -
                          </button>
                          <span className="text-xs w-6 text-center font-black dark:text-white">
                            {selected.quantity}
                          </span>
                          <button
                            onClick={() =>
                              updateComboItemQty(
                                product.id,
                                selected.quantity + 1,
                              )
                            }
                            className="w-7 h-7 rounded-md bg-zinc-50 dark:bg-white/5 hover:bg-zinc-100 dark:hover:bg-white/10 flex items-center justify-center text-zinc-500 dark:text-white transition-colors"
                          >
                            +
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>

            {/* Selected items summary & pricing */}
            {comboItems.length > 0 && (() => {
              const totalIndividual = comboItems.reduce((sum, item) => {
                const product = allProducts.find((p) => p.id === item.productId);
                return sum + (product ? parseFloat(product.price) * item.quantity : 0);
              }, 0);
              const comboPriceNum = parseFloat(comboPrice) || 0;
              const savings = totalIndividual - comboPriceNum;

              return (
                <div className="rounded-2xl border border-black/5 dark:border-white/10 overflow-hidden">
                  {/* Items breakdown */}
                  <div className="p-3 space-y-1.5 bg-zinc-50/50 dark:bg-white/[0.02]">
                    {comboItems.map((item) => {
                      const product = allProducts.find((p) => p.id === item.productId);
                      if (!product) return null;
                      return (
                        <div key={item.productId} className="flex items-center justify-between text-xs">
                          <span className="text-zinc-500 truncate flex-1 min-w-0 mr-2">
                            {product.name.en} <span className="text-zinc-400">x{item.quantity}</span>
                          </span>
                          <span className="text-zinc-600 dark:text-zinc-400 font-medium shrink-0">
                            {formatCurrency(parseFloat(product.price) * item.quantity)}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Totals */}
                  <div className="p-3 space-y-2 border-t border-black/5 dark:border-white/5 bg-white dark:bg-zinc-900">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                        Separate total
                      </span>
                      <span className="text-sm font-bold text-zinc-500 line-through">
                        {formatCurrency(totalIndividual)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-orange-600 dark:text-orange-400">
                        Combo price
                      </span>
                      <span className="text-lg font-black text-orange-600 dark:text-orange-400">
                        {comboPriceNum > 0 ? formatCurrency(comboPriceNum) : "—"}
                      </span>
                    </div>
                    {savings > 0 && comboPriceNum > 0 && (
                      <div className="flex items-center justify-between pt-1 border-t border-dashed border-black/5 dark:border-white/5">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                          Customer saves
                        </span>
                        <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-0.5 rounded-full">
                          -{formatCurrency(savings)} ({Math.round((savings / totalIndividual) * 100)}%)
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>

          <div className="pt-4">
            <button
              onClick={handleSaveCombo}
              className="w-full py-4 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-orange-600/20 transition-all disabled:opacity-50 disabled:shadow-none"
              disabled={
                !comboNames.en || !comboPrice || comboItems.length === 0
              }
            >
              {editingComboId ? "Update Combo Set" : "Create Combo Set"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// Empty State Component
function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-16 text-center"
    >
      <div className="mb-4">{icon}</div>
      <h3 className="text-lg font-semibold mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-4">
        {description}
      </p>
      {action}
    </motion.div>
  );
}
