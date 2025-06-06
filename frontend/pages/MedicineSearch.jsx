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
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Pill className="w-10 h-10 text-blue-600 mr-3" />
            <h1 className="text-4xl font-bold text-gray-800">Medicine Search</h1>
          </div>
          <p className="text-gray-600 text-lg">Find detailed information about medicines instantly</p>
        </div>

        {/* Search Section */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-8">
          <div className="relative mb-4">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-black" />
            </div>
          <input
  type="text"
  placeholder="Enter medicine name (e.g., Paracetamol, Aspirin...)"
  value={query}
  onChange={(e) => setQuery(e.target.value)}
  className="w-full pl-12 pr-12 py-4 text-lg border-2 border-gray-200 rounded-xl 
             focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all 
             duration-200 outline-none text-black placeholder-black" 
/>
            {query && (
              <button
                onClick={clearSearch}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            )}
          </div>

          {/* Search History */}
          {searchHistory.length > 0 && !query && (
            <div className="mb-4">
              <p className="text-sm text-gray-500 mb-2 flex items-center">
                <Clock className="w-4 h-4 mr-1" />
                Recent searches
              </p>
              <div className="flex flex-wrap gap-2">
                {searchHistory.map((term, index) => (
                  <button
                    key={index}
                    onClick={() => handleHistoryClick(term)}
                    className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-full transition-colors duration-200"
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
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">Searching medicines...</span>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="flex items-center p-4 bg-red-50 border border-red-200 rounded-xl">
              <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
              <span className="text-red-700">{error}</span>
            </div>
          )}
        </div>

        {/* Results Section */}
        {!loading && medicines.length > 0 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-gray-800 flex items-center">
                <Package className="w-6 h-6 mr-2 text-blue-600" />
                Search Results ({medicines.length} found)
              </h2>
            </div>

            {/* Results grouped by manufacturer */}
            {Object.entries(groupedMedicines).map(([manufacturer, meds]) => (
              <div key={manufacturer} className="bg-white rounded-2xl shadow-lg overflow-hidden">
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4">
                  <h3 className="text-lg font-semibold flex items-center">
                    <Building2 className="w-5 h-5 mr-2" />
                    {manufacturer} ({meds.length} products)
                  </h3>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Medicine</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Price</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Status</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Type & Pack</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Composition</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {meds.map((med, index) => (
                        <tr key={med._id} className="hover:bg-gray-50 transition-colors duration-150">
                          <td className="px-6 py-4">
                            <div className="flex items-start">
                              <Pill className="w-5 h-5 text-green-500 mr-2 mt-1 flex-shrink-0" />
                              <div>
                                <div className="font-semibold text-gray-900">{med.name}</div>
                                <div className="text-sm text-gray-500">{med.type}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-lg font-bold text-green-600">
                              ₹{med["price(₹)"]}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                              med.Is_discontinued 
                                ? 'bg-red-100 text-red-800' 
                                : 'bg-green-100 text-green-800'
                            }`}>
                              {med.Is_discontinued ? "Discontinued" : "Available"}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm">
                              <div className="font-medium text-gray-900">{med.type}</div>
                              <div className="text-gray-500">{med.pack_size_label}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-black space-y-1">
                              {med.short_composition1 && (
                                <div className="flex items-center">
                                  <FileText className="w-3 h-3 text-gray-400 mr-1" />
                                  {med.short_composition1}
                                </div>
                              )}
                              {med.short_composition2 && (
                                <div className="flex items-center">
                                  <FileText className="w-3 h-3 text-gray-400 font-black mr-1" />
                                  {med.short_composition2}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* No results message */}
        {!loading && medicines.length === 0 && query && !error && (
          <div className="text-center py-12">
            <Pill className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">No medicines found</h3>
            <p className="text-gray-500">Try searching with a different medicine name or check the spelling.</p>
          </div>
        )}

        {/* Welcome message when no search */}
        {!query && medicines.length === 0 && (
          <div className="text-center py-12 bg-white rounded-2xl shadow-lg">
            <Search className="w-16 h-16 text-blue-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">Start searching for medicines</h3>
            <p className="text-gray-500">Enter a medicine name above to get detailed information including price, composition, and availability.</p>
          </div>
        )}
      </div>
    </div>
  );
}