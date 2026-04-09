import React, { useState, useEffect, useMemo } from "react";
import { Search, Pill, AlertCircle, Clock, Package, Building2, FileText } from "lucide-react";

export default function MedicineSearch() {
  const [query, setQuery] = useState("");
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchHistory, setSearchHistory] = useState([]);

  // Debounced search effect for real-time search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (query.trim()) {
        handleSearch();
      } else {
        setMedicines([]);
        setError(null);
      }
    }, 500); // 500ms delay for real-time search

    return () => clearTimeout(timeoutId);
  }, [query]);

  const handleSearch = async () => {
    if (!query.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `http://localhost:5000/medicines/search?name=${encodeURIComponent(query)}`
      );

      if (!res.ok) {
        throw new Error("Failed to fetch medicines");
      }

      const data = await res.json();

      if (data.success) {
        setMedicines(data.data);
        // Add to search history if not already present
        if (data.data.length > 0 && !searchHistory.includes(query.trim())) {
          setSearchHistory(prev => [query.trim(), ...prev.slice(0, 4)]);
        }
      } else {
        setError(data.message || "No medicines found");
        setMedicines([]);
      }
    } catch (err) {
      setError(err.message);
      setMedicines([]);
    } finally {
      setLoading(false);
    }
  };

  const handleHistoryClick = (searchTerm) => {
    setQuery(searchTerm);
  };

  const clearSearch = () => {
    setQuery("");
    setMedicines([]);
    setError(null);
  };

  // Group medicines by manufacturer for better organization
  const groupedMedicines = useMemo(() => {
    const groups = {};
    medicines.forEach(med => {
      const manufacturer = med.manufacturer_name || "Unknown";
      if (!groups[manufacturer]) {
        groups[manufacturer] = [];
      }
      groups[manufacturer].push(med);
    });
    return groups;
  }, [medicines]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      <div className="container mx-auto px-3 sm:px-4 md:px-6 py-6 sm:py-8 md:py-10 max-w-7xl">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8 md:mb-10">
          <div className="flex items-center justify-center mb-3 sm:mb-4">
            <Pill className="w-7 sm:w-8 md:w-10 h-7 sm:h-8 md:h-10 text-blue-600 mr-2 sm:mr-3" />
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-800">Medicine Search</h1>
          </div>
          <p className="text-sm sm:text-base md:text-lg text-gray-600">Find detailed information about medicines instantly</p>
        </div>

        {/* Search Section */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl p-4 sm:p-6 md:p-8 mb-6 sm:mb-8 md:mb-10">
          <div className="relative mb-4">
            <div className="absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center pointer-events-none">
              <Search className="h-4 sm:h-5 w-4 sm:w-5 text-black" />
            </div>
          <input
  type="text"
  placeholder="Search medicines..."
  value={query}
  onChange={(e) => setQuery(e.target.value)}
  className="w-full pl-9 sm:pl-12 pr-9 sm:pr-12 py-2 sm:py-3 md:py-4 text-sm sm:text-base md:text-lg border-2 border-gray-200 rounded-lg sm:rounded-xl 
             focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all 
             duration-200 outline-none text-black placeholder-black" 
/>
            {query && (
              <button
                onClick={clearSearch}
                className="absolute inset-y-0 right-0 pr-3 sm:pr-4 flex items-center text-gray-400 hover:text-gray-600 text-xl sm:text-2xl"
              >
                ×
              </button>
            )}
          </div>

          {/* Search History */}
          {searchHistory.length > 0 && !query && (
            <div className="mb-4">
              <p className="text-xs sm:text-sm text-gray-500 mb-2 flex items-center">
                <Clock className="w-3 sm:w-4 h-3 sm:h-4 mr-1" />
                Recent searches
              </p>
              <div className="flex flex-wrap gap-1 sm:gap-2">
                {searchHistory.map((term, index) => (
                  <button
                    key={index}
                    onClick={() => handleHistoryClick(term)}
                    className="px-2 sm:px-3 py-0.5 sm:py-1 text-xs sm:text-sm bg-gray-100 hover:bg-gray-200 rounded-full transition-colors duration-200"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Loading indicator */}
          {loading && (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-5 sm:h-6 w-5 sm:w-6 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-sm sm:text-base text-gray-600">Searching medicines...</span>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="flex items-center p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg sm:rounded-xl">
              <AlertCircle className="w-4 sm:w-5 h-4 sm:h-5 text-red-500 mr-2 flex-shrink-0" />
              <span className="text-sm sm:text-base text-red-700">{error}</span>
            </div>
          )}
        </div>

        {/* Results Section */}
        {!loading && medicines.length > 0 && (
          <div className="space-y-4 sm:space-y-6 md:space-y-8">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-semibold text-gray-800 flex items-center">
                <Package className="w-5 sm:w-6 md:w-7 h-5 sm:h-6 md:h-7 mr-2 text-blue-600" />
                Search Results ({medicines.length} found)
              </h2>
            </div>

            {/* Results grouped by manufacturer */}
            {Object.entries(groupedMedicines).map(([manufacturer, meds]) => (
              <div key={manufacturer} className="bg-white rounded-xl sm:rounded-2xl shadow-lg overflow-hidden">
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-3 sm:p-4 md:p-5">
                  <h3 className="text-sm sm:text-base md:text-lg font-semibold flex items-center flex-wrap gap-1">
                    <Building2 className="w-4 sm:w-5 md:w-6 h-4 sm:h-5 md:h-6 flex-shrink-0" />
                    {manufacturer} ({meds.length} products)
                  </h3>
                </div>
                
                {/* Mobile: Card view, Desktop: Table view */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 md:px-6 py-3 md:py-4 text-left text-xs md:text-sm font-semibold text-gray-700">Medicine</th>
                        <th className="px-4 md:px-6 py-3 md:py-4 text-left text-xs md:text-sm font-semibold text-gray-700">Price</th>
                        <th className="px-4 md:px-6 py-3 md:py-4 text-left text-xs md:text-sm font-semibold text-gray-700">Status</th>
                        <th className="px-4 md:px-6 py-3 md:py-4 text-left text-xs md:text-sm font-semibold text-gray-700">Pack</th>
                        <th className="px-4 md:px-6 py-3 md:py-4 text-left text-xs md:text-sm font-semibold text-gray-700">Composition</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {meds.map((med, index) => (
                        <tr key={med._id} className="hover:bg-gray-50 transition-colors duration-150">
                          <td className="px-4 md:px-6 py-3 md:py-4">
                            <div className="flex items-start">
                              <Pill className="w-4 md:w-5 h-4 md:h-5 text-green-500 mr-2 mt-0.5 md:mt-1 flex-shrink-0" />
                              <div>
                                <div className="font-semibold text-sm md:text-base text-gray-900">{med.name}</div>
                                <div className="text-xs md:text-sm text-gray-500">{med.type}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 md:px-6 py-3 md:py-4">
                            <div className="text-base md:text-lg font-bold text-green-600">
                              ₹{med["price(₹)"]}
                            </div>
                          </td>
                          <td className="px-4 md:px-6 py-3 md:py-4">
                            <span className={`px-2 md:px-3 py-0.5 md:py-1 rounded-full text-xs md:text-sm font-medium ${
                              med.Is_discontinued 
                                ? 'bg-red-100 text-red-800' 
                                : 'bg-green-100 text-green-800'
                            }`}>
                              {med.Is_discontinued ? "Discontinued" : "Available"}
                            </span>
                          </td>
                          <td className="px-4 md:px-6 py-3 md:py-4">
                            <div className="text-xs md:text-sm">
                              <div className="font-medium text-gray-900">{med.type}</div>
                              <div className="text-gray-500">{med.pack_size_label}</div>
                            </div>
                          </td>
                          <td className="px-4 md:px-6 py-3 md:py-4">
                            <div className="text-xs md:text-sm text-black space-y-0.5 md:space-y-1">
                              {med.short_composition1 && (
                                <div className="flex items-center">
                                  <FileText className="w-3 h-3 text-gray-400 mr-1 flex-shrink-0" />
                                  <span className="truncate">{med.short_composition1}</span>
                                </div>
                              )}
                              {med.short_composition2 && (
                                <div className="flex items-center">
                                  <FileText className="w-3 h-3 text-gray-400 mr-1 flex-shrink-0" />
                                  <span className="truncate">{med.short_composition2}</span>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile: Card view */}
                <div className="md:hidden divide-y divide-gray-200">
                  {meds.map((med, index) => (
                    <div key={med._id} className="p-3 sm:p-4 hover:bg-gray-50 transition-colors duration-150">
                      <div className="flex items-start gap-2 mb-2">
                        <Pill className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900 text-sm">{med.name}</div>
                          <div className="text-xs text-gray-500">{med.type}</div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-gray-500 block">Price</span>
                          <span className="font-bold text-green-600">₹{med["price(₹)"]}</span>
                        </div>
                        <div>
                          <span className="text-gray-500 block">Status</span>
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                            med.Is_discontinued 
                              ? 'bg-red-100 text-red-800' 
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {med.Is_discontinued ? "Discontinued" : "Available"}
                          </span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-gray-500 block">Pack</span>
                          <span className="text-gray-900">{med.pack_size_label}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* No results message */}
        {!loading && medicines.length === 0 && query && !error && (
          <div className="text-center py-8 sm:py-12 md:py-16 px-4">
            <Pill className="w-12 sm:w-14 md:w-16 h-12 sm:h-14 md:h-16 text-gray-300 mx-auto mb-3 sm:mb-4 md:mb-6" />
            <h3 className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-600 mb-1 sm:mb-2">No medicines found</h3>
            <p className="text-sm sm:text-base text-gray-500">Try searching with a different medicine name or check the spelling.</p>
          </div>
        )}

        {/* Welcome message when no search */}
        {!query && medicines.length === 0 && (
          <div className="text-center py-8 sm:py-12 md:py-16 px-4 bg-white rounded-xl sm:rounded-2xl shadow-lg">
            <Search className="w-12 sm:w-14 md:w-16 h-12 sm:h-14 md:h-16 text-blue-400 mx-auto mb-3 sm:mb-4 md:mb-6" />
            <h3 className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-700 mb-1 sm:mb-2">Start searching for medicines</h3>
            <p className="text-sm sm:text-base text-gray-500">Enter a medicine name above to get detailed information including price, composition, and availability.</p>
          </div>
        )}
      </div>
    </div>
  );
}