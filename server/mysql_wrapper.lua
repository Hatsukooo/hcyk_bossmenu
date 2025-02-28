ESX = exports["es_extended"]:getSharedObject()

SafeMySQL = {}

local function logError(message, ...)
    local args = {...}
    local formatted = string.format(message, table.unpack(args))
    print('^1[HCYK_BOSSACTIONS] ERROR: ' .. formatted .. '^7')
end

SafeMySQL.fetch = function(query, params, defaultReturn)
    defaultReturn = defaultReturn or {}
    
    local success, result = pcall(function()
        return MySQL.Sync.fetchAll(query, params)
    end)
    
    if not success then
        logError("Database query failed: %s", result)
        return defaultReturn
    end
    
    return result or defaultReturn
end

SafeMySQL.scalar = function(query, params, defaultReturn)
    defaultReturn = defaultReturn or 0
    
    local success, result = pcall(function()
        return MySQL.Sync.fetchScalar(query, params)
    end)
    
    if not success then
        logError("Database scalar query failed: %s", result)
        return defaultReturn
    end
    
    return result or defaultReturn
end

SafeMySQL.execute = function(query, params, defaultReturn)
    defaultReturn = defaultReturn or 0
    
    local success, result = pcall(function()
        return MySQL.Sync.execute(query, params)
    end)
    
    if not success then
        logError("Database execute failed: %s", result)
        return defaultReturn
    end
    
    return result or defaultReturn
end

SafeMySQL.insert = function(query, params, defaultReturn)
    defaultReturn = defaultReturn or 0
    
    local success, result = pcall(function()
        return MySQL.Sync.insert(query, params)
    end)
    
    if not success then
        logError("Database insert failed: %s", result)
        return defaultReturn
    end
    
    return result or defaultReturn
end

SafeMySQL.fetchAsync = function(query, params, callback)
    MySQL.Async.fetchAll(query, params, function(result)
        callback(result or {})
    end, function(error)
        logError("Async database query failed: %s", error)
        callback({})
    end)
end

return SafeMySQL
