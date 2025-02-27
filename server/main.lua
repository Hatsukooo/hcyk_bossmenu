ESX = exports["es_extended"]:getSharedObject()

local function logError(message, ...)
    local args = {...}
    local formatted = string.format(message, table.unpack(args))
    print('^1[HCYK_BOSSACTIONS] ERROR: ' .. formatted .. '^7')
end

function LogError(source, message)
    local identifier = "Unknown"
    local name = "Unknown"
    
    if source > 0 then
        local xPlayer = ESX.GetPlayerFromId(source)
        if xPlayer then
            identifier = xPlayer.identifier
            name = xPlayer.getName()
        end
    end
    
    print(string.format("[ERROR] %s | %s | %s", identifier, name, message))
end

-- Helper function to check boss permissions
local function checkBossPermissions(source, job)
    local xPlayer = ESX.GetPlayerFromId(source)
    return xPlayer and xPlayer.getJob().name == job and xPlayer.getJob().grade_name == 'boss'
end

-- Debug logging function
local function debugLog(...)
    if Config.Debug then
        print('[HCYK_BOSSACTIONS]', ...)
    end
end

-- Callbacky pro získání dat
lib.callback.register('hcyk_bossactions:getJobData', function(source, job)
    if not checkBossPermissions(source, job) then
        debugLog("getJobData: Permission denied for player", source)
        return nil
    end
    
    local jobData = GetJobData(job)
    if not jobData then
        debugLog("getJobData: No job data found for", job)
    end
    
    return jobData
end)

lib.callback.register('hcyk_bossactions:getEmployees', function(source, job)
    if not checkBossPermissions(source, job) then
        debugLog("getEmployees: Permission denied for player", source)
        return {}
    end
    
    local employees = GetEmployees(job)
    debugLog("getEmployees: Found", #employees, "employees for job", job)
    
    return employees
end)

lib.callback.register('hcyk_bossactions:getNearbyPlayers', function(source, job)
    local xPlayer = ESX.GetPlayerFromId(source)
    
    -- Check boss permissions
    if not checkBossPermissions(source, job) then
        debugLog("getNearbyPlayers: Permission denied for player", source)
        return {}
    end
    
    -- Get coordinates of the boss
    local bossCoords = nil
    if xPlayer and xPlayer.getCoords then
        bossCoords = xPlayer.getCoords(true) -- true to include height
    end
    
    if not bossCoords then
        debugLog("getNearbyPlayers: Could not get coordinates for player", source)
        return {}
    end
    
    local nearbyPlayers = {}
    local players = ESX.GetPlayers()
    local maxDistance = 10.0 -- Maximum distance to consider a player "nearby"
    
    for _, playerId in ipairs(players) do
        -- Skip the boss
        if playerId ~= source then
            local targetPlayer = ESX.GetPlayerFromId(playerId)
            
            if targetPlayer then
                local targetCoords = targetPlayer.getCoords(true)
                local distance = #(bossCoords - targetCoords)
                
                -- Check if player is nearby and not already employed in this job
                if distance <= maxDistance and targetPlayer.getJob().name ~= job then
                    table.insert(nearbyPlayers, {
                        id = playerId,
                        name = targetPlayer.getName() or ("Player " .. playerId)
                    })
                end
            end
        end
    end
    
    debugLog("getNearbyPlayers: Found", #nearbyPlayers, "nearby players")
    return nearbyPlayers
end)