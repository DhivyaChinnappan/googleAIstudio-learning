import React, { useState, useEffect } from "react";
import { ChefHat, ShoppingBag, Clock, Users, Flame, BookOpen, Heart, Sparkles, AlertCircle, RefreshCw, Star, ArrowUpRight } from "lucide-react";
import { Recipe } from "./types";
import { INITIAL_RECIPES } from "./data";
import IngredientInput from "./components/IngredientInput";
import RecipeCard from "./components/RecipeCard";
import CookingSessionModal from "./components/CookingSessionModal";
import SavedCollection from "./components/SavedCollection";
import FavoritesSection from "./components/FavoritesSection";

const MEAL_TYPES = ["Breakfast", "Lunch", "Dinner", "Snack"] as const;
const COOKING_TIMES = [
  { label: "15 mins or less", value: "15" },
  { label: "30 mins or less", value: "30" },
  { label: "45 mins or less", value: "45" },
  { label: "60 mins+", value: "60" }
];

const LOADING_FACTS = [
  "Mincing fresh garlic cloves and infusing oils...",
  "Searing skillet proteins and reducing pan juices...",
  "Balancing micro-nutrients and fiber content ratios...",
  "Dicing garden tomatoes and picking basil leaves...",
  "Calculating the optimal culinary plate presentation...",
  "Polishing gourmet cooking timers and instructions..."
];

export default function App() {
  const [currentTab, setCurrentTab] = useState<"find" | "collection" | "favorites">("find");
  
  // Custom pantry ingredients list
  const [ingredients, setIngredients] = useState<string[]>([]);
  
  // Multi-parameter sliders/inputs
  const [peopleCount, setPeopleCount] = useState<number>(2);
  const [mealType, setMealType] = useState<typeof MEAL_TYPES[number]>("Dinner");
  const [cookingTime, setCookingTime] = useState<string>("30");

  // suggestions results from AI or Mock Fallback
  const [suggestions, setSuggestions] = useState<Recipe[]>([]);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isAiUsed, setIsAiUsed] = useState<boolean>(true);
  const [generationError, setGenerationError] = useState<string>("");

  // Loading indicator fact rotation
  const [loadingFactIdx, setLoadingFactIdx] = useState(0);

  // User persistent recipe index
  const [savedRecipes, setSavedRecipes] = useState<Recipe[]>(() => {
    try {
      const stored = localStorage.getItem("recipe_companion_saved");
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn("Local storage loading failed. Loading defaults:", e);
    }
    return INITIAL_RECIPES;
  });

  // Modal active cooking state
  const [activeCookRecipe, setActiveCookRecipe] = useState<Recipe | null>(null);

  // Dynamic state syncing
  useEffect(() => {
    localStorage.setItem("recipe_companion_saved", JSON.stringify(savedRecipes));
  }, [savedRecipes]);

  // Rotate loading facts during generation
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isGenerating) {
      interval = setInterval(() => {
        setLoadingFactIdx((prev) => (prev + 1) % LOADING_FACTS.length);
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [isGenerating]);

  const handleAddIngredient = (name: string) => {
    const normalized = name.trim();
    if (!normalized) return;
    if (!ingredients.some(i => i.toLowerCase() === normalized.toLowerCase())) {
      setIngredients(prev => [...prev, normalized]);
    }
  };

  const handleRemoveIngredient = (name: string) => {
    setIngredients(prev => prev.filter(i => i.toLowerCase() !== name.toLowerCase()));
  };

  const handleClearIngredients = () => {
    setIngredients([]);
  };

  const handleToggleFavorite = (id: string) => {
    setSavedRecipes(prev =>
      prev.map(recipe =>
        recipe.id === id ? { ...recipe, isFavorite: !recipe.isFavorite } : recipe
      )
    );
    // Sync active modal if opened
    if (activeCookRecipe?.id === id) {
      setActiveCookRecipe(prev => prev ? { ...prev, isFavorite: !prev.isFavorite } : null);
    }
  };

  const handleToggleSave = (recipe: Recipe) => {
    const exists = savedRecipes.some(r => r.id === recipe.id);
    if (exists) {
      // Remove
      setSavedRecipes(prev => prev.filter(r => r.id !== recipe.id));
    } else {
      // Add
      const newSaved: Recipe = {
        ...recipe,
        dateSaved: new Date().toISOString().split("T")[0]
      };
      setSavedRecipes(prev => [newSaved, ...prev]);
    }
  };

  const handleUpdateNotes = (id: string, notes: string) => {
    setSavedRecipes(prev =>
      prev.map(r => r.id === id ? { ...r, notes } : r)
    );
    // Sync active suggestions note text if visible
    setSuggestions(prev =>
      prev.map(r => r.id === id ? { ...r, notes } : r)
    );
  };

  const handleAddCustomRecipe = (recipe: Recipe) => {
    setSavedRecipes(prev => [recipe, ...prev]);
  };

  // Async API Call
  const handleGenerateRecipes = async () => {
    if (ingredients.length === 0) return;
    setIsGenerating(true);
    setGenerationError("");
    setSuggestions([]);

    try {
      const response = await fetch("/api/recipes/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ingredients,
          peopleCount,
          mealType,
          cookingTime
        })
      });

      if (!response.ok) {
        throw new Error(`Server status returned ${response.status}`);
      }

      const data = await response.json();
      if (data.recipes && Array.isArray(data.recipes)) {
        const items = data.recipes.map((r: any, idx: number) => ({
          ...r,
          id: r.id || `gen_${idx}_${Date.now()}`
        }));
        setSuggestions(items);
        setIsAiUsed(data.isAiGenerated);
      } else {
        throw new Error("Invalid structure returned from kitchen assistant.");
      }
    } catch (err: any) {
      console.error(err);
      setGenerationError(err.message || "Unable to reach your kitchen companion. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const favoritedCount = savedRecipes.filter(r => r.isFavorite).length;

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-800 flex flex-col font-sans selection:bg-amber-100 selection:text-amber-900 leading-normal">
      
      {/* Top Professional Header Bar */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-100 shadow-3xs" id="app-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
              <ChefHat size={20} strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="font-serif text-base sm:text-lg font-bold text-slate-900 tracking-tight leading-none">
                Recipe Companion
              </h1>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mt-0.5">
                AI Culinary Director
              </span>
            </div>
          </div>

          {/* Tab Navigation with Counters */}
          <nav className="flex gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setCurrentTab("find")}
              className={`px-3 py-2 rounded-lg transition-all flex items-center gap-1 shrink-0 ${
                currentTab === "find"
                  ? "bg-white text-slate-950 shadow-3xs font-bold"
                  : "text-slate-550 hover:text-slate-800 hover:bg-slate-50/60"
              }`}
            >
              <Sparkles size={13} className={currentTab === "find" ? "text-amber-500" : ""} />
              <span className="hidden sm:inline">Find Recipes</span>
              <span className="inline sm:hidden">Find</span>
            </button>
            <button
              onClick={() => setCurrentTab("collection")}
              className={`px-3 py-2 rounded-lg transition-all flex items-center gap-1 shrink-0 ${
                currentTab === "collection"
                  ? "bg-white text-slate-950 shadow-3xs font-bold"
                  : "text-slate-550 hover:text-slate-800 hover:bg-slate-50/60"
              }`}
            >
              <BookOpen size={13} className={currentTab === "collection" ? "text-amber-500" : ""} />
              <span>Collection</span>
              <span className="text-[10px] bg-slate-205 text-slate-600 font-mono font-bold px-1.5 py-0.5 rounded-full bg-slate-200">
                {savedRecipes.length}
              </span>
            </button>
            <button
              onClick={() => setCurrentTab("favorites")}
              className={`px-3 py-2 rounded-lg transition-all flex items-center gap-1 shrink-0 ${
                currentTab === "favorites"
                  ? "bg-white text-slate-950 shadow-3xs font-bold"
                  : "text-slate-550 hover:text-slate-800 hover:bg-slate-50/60"
              }`}
            >
              <Heart size={13} className={currentTab === "favorites" ? "text-rose-500 fill-rose-500" : ""} />
              <span>Favorites</span>
              <span className="text-[10px] bg-rose-50 text-rose-600 font-mono font-bold px-1.5 py-0.5 rounded-full bg-rose-100">
                {favoritedCount}
              </span>
            </button>
          </nav>
        </div>
      </header>

      {/* Main Container Stage */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {currentTab === "find" ? (
          /* Tab 1: AI Recipe Suggestion Engine */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start" id="recipe-search-stage">
            
            {/* Left Parameters column (Span 5) */}
            <div className="lg:col-span-5 space-y-6">
              
              <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-3xs space-y-5">
                <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                  <div>
                    <h2 className="font-serif text-lg font-bold text-slate-900">
                      Culinary Planner
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Tune your available kitchen resources
                    </p>
                  </div>
                  <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-505 flex items-center justify-center">
                    <Flame size={15} />
                  </div>
                </div>

                {/* Ingredient Entry Sub-compo */}
                <IngredientInput
                  ingredients={ingredients}
                  onAddIngredient={handleAddIngredient}
                  onRemoveIngredient={handleRemoveIngredient}
                  onClearAll={handleClearIngredients}
                />

                {/* Servings Slider & Portions Choice */}
                <div className="space-y-2 mt-4 pt-4 border-t border-slate-100">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-700 flex items-center gap-1.5">
                      <Users size={14} className="text-slate-400" />
                      <span>Number of People</span>
                    </span>
                    <span className="font-mono font-bold bg-amber-50 text-amber-800 px-2 py-0.5 rounded-md">
                      {peopleCount} portions
                    </span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={10}
                    value={peopleCount}
                    onChange={(e) => setPeopleCount(Number(e.target.value))}
                    className="w-full accent-amber-500 h-1.5 bg-slate-100 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 font-bold">
                    <span>1 (Solo)</span>
                    <span>5 (Family)</span>
                    <span>10 (Party)</span>
                  </div>
                </div>

                {/* Meal Type Selection Tabs Grid */}
                <div className="space-y-2 pt-4 border-t border-slate-100">
                  <span className="text-xs font-bold text-slate-700 block">
                    Meal Category
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4 gap-2">
                    {MEAL_TYPES.map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setMealType(type)}
                        className={`py-2 text-xs font-semibold rounded-xl text-center border transition-all ${
                          mealType === type
                            ? "bg-amber-500 border-amber-505 text-white shadow-xs"
                            : "bg-slate-50 hover:bg-slate-100 border-slate-100 text-slate-600"
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Available Cooking Time */}
                <div className="space-y-2 pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                    <Clock size={14} className="text-slate-400" />
                    <span>How much cooking time?</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {COOKING_TIMES.map((time) => (
                      <button
                        key={time.value}
                        type="button"
                        onClick={() => setCookingTime(time.value)}
                        className={`py-2 px-3 text-xs font-medium rounded-xl border text-left transition-all ${
                          cookingTime === time.value
                            ? "bg-amber-50 border-amber-300 text-amber-900 font-semibold shadow-2xs"
                            : "bg-slate-50 hover:bg-slate-100 border-slate-100 text-slate-600"
                        }`}
                      >
                        {time.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Action Button: Query Suggestions */}
                <button
                  type="button"
                  onClick={handleGenerateRecipes}
                  disabled={ingredients.length === 0 || isGenerating}
                  className="w-full mt-4 py-3.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 text-white font-bold text-sm rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed group"
                  id="recipe-generator-btn"
                >
                  <RefreshCw className={`w-4 h-4 ${isGenerating ? "animate-spin" : "group-hover:rotate-45 transition-transform"}`} />
                  <span>{isGenerating ? "Preparing recipes..." : "Generate 3 Suggestions"}</span>
                </button>
              </div>

            </div>

            {/* Right Results column (Span 7) */}
            <div className="lg:col-span-7 space-y-6" id="results-pane">
              
              {/* Conditional warning if fallback recipes loaded */}
              {!isGenerating && suggestions.length > 0 && !isAiUsed && (
                <div className="bg-amber-50 border border-amber-200/60 p-4 rounded-2xl flex items-start gap-3">
                  <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={16} />
                  <div className="text-xs text-amber-900 leading-relaxed">
                    <strong className="block font-semibold">Running in Offline / Preset Mode</strong>
                    To unlock infinite bespoke, gourmet recipes based on your specific kitchen inventory, simply connect your <strong>GEMINI_API_KEY</strong> using the <strong>Secrets</strong> panel inside the AI Studio UI!
                  </div>
                </div>
              )}

              {/* Suggestions State views */}
              {isGenerating ? (
                /* Generating State */
                <div className="bg-white rounded-3xl p-12 border border-slate-100 shadow-3xs text-center flex flex-col justify-center items-center min-h-[50vh]">
                  
                  {/* Glowing spinner */}
                  <div className="relative w-16 h-16 mb-6">
                    <div className="absolute inset-0 rounded-full border-4 border-slate-100/80"></div>
                    <div className="absolute inset-0 rounded-full border-4 border-amber-500 border-t-transparent animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center text-amber-500">
                      <ChefHat size={22} className="animate-pulse" />
                    </div>
                  </div>

                  <h3 className="font-serif text-lg sm:text-xl font-bold text-slate-900 mb-1">
                    AI Kitchen is Active
                  </h3>
                  
                  {/* Rotating Fact Slider */}
                  <div className="h-10 mt-1">
                    <p className="text-xs text-slate-550 italic animate-pulse max-w-sm mx-auto">
                      "{LOADING_FACTS[loadingFactIdx]}"
                    </p>
                  </div>

                  <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mt-4">
                    Drafting three matching culinary cards...
                  </p>
                </div>
              ) : errorState(generationError) ? (
                /* Error State */
                <div className="bg-white rounded-3xl p-8 border border-red-50 text-center min-h-[40vh] flex flex-col justify-center items-center">
                  <AlertCircle size={36} className="text-rose-500 mb-3" />
                  <h3 className="font-serif text-base font-bold text-slate-800">
                    Failed to compose recipe suggestions
                  </h3>
                  <p className="text-xs text-rose-600 max-w-md mx-auto mt-1 leading-relaxed">
                    {generationError}
                  </p>
                  <button
                    onClick={handleGenerateRecipes}
                    className="mt-4 px-4.5 py-2 bg-slate-950 text-white rounded-xl text-xs font-semibold"
                  >
                    Retry Generation
                  </button>
                </div>
              ) : suggestions.length > 0 ? (
                /* Suggestion list Loaded State */
                <div className="space-y-6">
                  <div className="flex justify-between items-center px-1">
                    <div>
                      <h2 className="font-serif text-lg font-bold text-slate-900">
                        Menu Suggestions
                      </h2>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Generated based on your {ingredients.length} available pantry items
                      </p>
                    </div>
                    <span className="text-[10px] font-mono font-extrabold uppercase bg-amber-500 text-white px-2 py-0.5 rounded-md leading-none">
                      3 suggestions
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="suggestions-grid">
                    {suggestions.map((recipe) => {
                      const isSaved = savedRecipes.some(r => r.id === recipe.id);
                      return (
                        <RecipeCard
                          key={recipe.id}
                          recipe={recipe}
                          isSaved={isSaved}
                          onToggleFavorite={handleToggleFavorite}
                          onToggleSave={handleToggleSave}
                          onStartCooking={setActiveCookRecipe}
                          onUpdateNotes={handleUpdateNotes}
                        />
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* Standard Waiting State */
                <div className="bg-white rounded-3xl p-12 border border-slate-105 border-dashed text-center flex flex-col justify-center items-center min-h-[55vh] p-8">
                  <div className="w-14 h-14 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center mb-4">
                    <ChefHat size={26} strokeWidth={1.5} />
                  </div>
                  <h3 className="font-serif text-lg font-bold text-slate-800 mb-1">
                    Awaiting Kitchen Inventory
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed max-w-md mx-auto">
                    Type your ingredients on the Planner panel, customize portion sizing, meal category (such as Dinner), and ready times, then click <strong>Generate Suggestions</strong> to inspire your next delicious meal!
                  </p>

                  {/* Preloaded quick-view tip box */}
                  <div className="bg-amber-50/50 rounded-2xl p-4.5 text-left border border-amber-100/50 text-xs mt-8 max-w-sm w-full">
                    <span className="font-bold text-amber-900 block mb-1">💡 Pro Tip</span>
                    Select <strong>Eggs</strong>, <strong>Bread</strong>, and <strong>Garlic</strong> from the quick-add staples panel on the left to quickly test out the companion's creative menus!
                  </div>
                </div>
              )}

            </div>

          </div>
        ) : currentTab === "collection" ? (
          /* Tab 2: My Recipe Collection */
          <SavedCollection
            savedRecipes={savedRecipes}
            onToggleFavorite={handleToggleFavorite}
            onToggleSave={handleToggleSave}
            onStartCooking={setActiveCookRecipe}
            onUpdateNotes={handleUpdateNotes}
            onAddCustomRecipe={handleAddCustomRecipe}
          />
        ) : (
          /* Tab 3: N's Favorite Foods SPOTLIGHT */
          <FavoritesSection
            savedRecipes={savedRecipes}
            onToggleFavorite={handleToggleFavorite}
            onToggleSave={handleToggleSave}
            onStartCooking={setActiveCookRecipe}
            onUpdateNotes={handleUpdateNotes}
          />
        )}
      </main>

      {/* Footer System Credits */}
      <footer className="bg-white border-t border-slate-100 py-6 mt-12 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4">
          <p>© 2026 Cooking Companion. All culinary assets and suggestions matching requirements.</p>
        </div>
      </footer>

      {/* Render active immersive cooking wizard modal */}
      {activeCookRecipe && (
        <CookingSessionModal
          recipe={activeCookRecipe}
          isSaved={savedRecipes.some(r => r.id === activeCookRecipe.id)}
          onClose={() => setActiveCookRecipe(null)}
          onUpdateNotes={handleUpdateNotes}
          onToggleFavorite={handleToggleFavorite}
          onToggleSave={handleToggleSave}
        />
      )}

    </div>
  );
}

// Simple Helper to assert if string error exists
function errorState(err: string) {
  return err && err.trim() !== "";
}
