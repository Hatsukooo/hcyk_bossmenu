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

local function checkBossPermissions(source, job)
    local xPlayer = ESX.GetPlayerFromId(source)
    return xPlayer and xPlayer.getJob().name == job and xPlayer.getJob().grade_name == 'boss'
end

local function debugLog(...)
    if Config.Debug then
        print('[HCYK_BOSSACTIONS]', ...)
    end
end

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
    
    if not checkBossPermissions(source, job) then
        debugLog("getNearbyPlayers: Permission denied for player", source)
        return {}
    end
    
    local bossCoords = nil
    if xPlayer and xPlayer.getCoords then
        bossCoords = xPlayer.getCoords(true)
    end
    
    if not bossCoords then
        debugLog("getNearbyPlayers: Could not get coordinates for player", source)
        return {}
    end
    
    local nearbyPlayers = {}
    local players = ESX.GetPlayers()
    local maxDistance = 10.0
    
    for _, playerId in ipairs(players) do
        if playerId ~= source then
            local targetPlayer = ESX.GetPlayerFromId(playerId)
            
            if targetPlayer then
                local targetCoords = targetPlayer.getCoords(true)
                local distance = #(bossCoords - targetCoords)

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

function CalculatePerformance(identifier)
    local defaultPerformance = 75
    
    local currentTime = os.time()
    local currentDate = os.date("*t", currentTime)
    local dayOfWeek = currentDate.wday - 1
    if dayOfWeek == 0 then dayOfWeek = 7 end
    
    local secondsToSubtract = (dayOfWeek - 1) * 86400 + currentDate.hour * 3600 + currentDate.min * 60 + currentDate.sec
    local weekStartTime = currentTime - secondsToSubtract
    
    local query = "SELECT SUM(duration) AS weekly_time FROM player_playtime WHERE identifier = ? AND timestamp >= ?"
    local result = MySQL.Sync.fetchAll(query, {identifier, weekStartTime})
    
    if result and result[1] and result[1].weekly_time then
        local weeklyHours = result[1].weekly_time / 3600
        
        local performance = math.floor((weeklyHours / 2) * 0.57)
        
        performance = math.max(0, math.min(100, performance))
        return performance
    end
    
    return defaultPerformance
end

lib.callback.register('hcyk_bossactions:getEmployees', function(source, job)
    local result = {}
    local success = false
    
    if success and result then
        for i, employee in ipairs(result) do
            employee.performance = CalculatePerformance(employee.identifier)
        end
        return result
    end
    
    if success and result then
        for i, employee in ipairs(result) do
            employee.performance = CalculatePerformance(employee.identifier)
        end
        return result
    end
    
    return {}
end)
local playerSessions = {}

lib.callback.register('hcyk_bossactions:getEmployeePlaytime', function(source, job, identifier)
    local xPlayer = ESX.GetPlayerFromId(source)
    
    if not xPlayer or xPlayer.getJob().name ~= job or xPlayer.getJob().grade_name ~= 'boss' then
        return {}
    end
    
    local currentTime = os.time()
    local currentDate = os.date("*t", currentTime)
    local dayOfWeek = currentDate.wday - 1
    if dayOfWeek == 0 then dayOfWeek = 7 end
    
    local secondsToSubtract = (dayOfWeek - 1) * 86400 + currentDate.hour * 3600 + currentDate.min * 60 + currentDate.sec
    local weekStartTime = currentTime - secondsToSubtract
    
    local result = {}
    local daysOfWeek = {"Po", "Út", "St", "Čt", "Pá", "So", "Ne"}
    
    for i=1, 7 do
        result[i] = {
            day = daysOfWeek[i],
            hours = 0,
            performance = 0
        }
    end
    
    local success, playtimeData = pcall(function()
        return MySQL.Sync.fetchAll(
            "SELECT DATE_FORMAT(FROM_UNIXTIME(timestamp), '%w') as day_of_week, " ..
            "SUM(duration) / 3600 as hours " ..
            "FROM player_playtime " ..
            "WHERE identifier = ? AND timestamp >= ? " ..
            "GROUP BY day_of_week", 
            {identifier, weekStartTime}
        )
    end)
    
    if success and playtimeData then
        for _, dayData in ipairs(playtimeData) do
            local dayIndex = tonumber(dayData.day_of_week)
            
            if dayIndex == 0 then dayIndex = 7 end
            
            local hours = tonumber(dayData.hours) or 0
            result[dayIndex].hours = math.floor(hours * 10) / 10

            result[dayIndex].performance = math.floor((hours / 2) * 0.57 * 100)
            result[dayIndex].performance = math.min(100, math.max(0, result[dayIndex].performance))
        end
    end
    
    local resultArray = {}
    for i=1, 7 do
        table.insert(resultArray, result[i])
    end
    
    return resultArray
end)

AddEventHandler('playerJoining', function()
    local src = source
    local identifier = ESX.GetPlayerFromId(src).identifier
    if identifier then
        playerSessions[src] = {
            identifier = identifier,
            startTime = os.time()
        }
    end
end)

AddEventHandler('playerDropped', function()
    local src = source
    if playerSessions[src] then
        local duration = os.time() - playerSessions[src].startTime
        if duration > 60 then
            MySQL.Async.execute('INSERT INTO player_playtime (identifier, timestamp, duration) VALUES (?, ?, ?)',
                {playerSessions[src].identifier, playerSessions[src].startTime, duration})
        end
        playerSessions[src] = nil
    end
end)

CreateThread(function()
    while true do
        Wait(900000)
        
        local currentTime = os.time()
        for src, session in pairs(playerSessions) do
            local duration = currentTime - session.startTime
            MySQL.Async.execute('INSERT INTO player_playtime (identifier, timestamp, duration) VALUES (?, ?, ?)',
                {session.identifier, session.startTime, duration})
                
            playerSessions[src].startTime = currentTime
        end
    end
end)