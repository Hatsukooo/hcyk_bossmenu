local function logError(message, ...)
    local args = {...}
    local formatted = string.format(message, table.unpack(args))
    print('^1[HCYK_BOSSACTIONS] ERROR: ' .. formatted .. '^7')
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
    if not checkBossPermissions(source, job) then
        debugLog("getEmployees: Permission denied for player", source)
        return {}
    end
    
    local employees = GetEmployees(job)
    debugLog("getEmployees: Found", #employees, "employees for job", job)
    for i, employee in ipairs(employees) do
        employee.performance = CalculatePerformance(employee.identifier)
    end
    
    return employees
end)

local playerSessions = {}

RegisterNetEvent('esx:playerLoaded')
AddEventHandler('esx:playerLoaded', function(source, xPlayer)
    local src = source or xPlayer.source
    local identifier = xPlayer.identifier
    
    if identifier then
        print("[HCYK_BOSSACTIONS] Player session started for: " .. identifier)
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
            
            print("[HCYK_BOSSACTIONS] Player session ended for: " .. playerSessions[src].identifier .. " (Duration: " .. duration .. " seconds)")
        end
        playerSessions[src] = nil
    end
end)

CreateThread(function()
    Wait(5000)
    
    local players = ESX.GetPlayers()
    for _, playerId in ipairs(players) do
        local xPlayer = ESX.GetPlayerFromId(playerId)
        if xPlayer and not playerSessions[playerId] then
            print("[HCYK_BOSSACTIONS] Adding session for already connected player: " .. xPlayer.identifier)
            playerSessions[playerId] = {
                identifier = xPlayer.identifier,
                startTime = os.time()
            }
        end
    end
    
    while true do
        Wait(900000)
        
        local currentTime = os.time()
        for src, session in pairs(playerSessions) do
            local duration = currentTime - session.startTime
            MySQL.Async.execute('INSERT INTO player_playtime (identifier, timestamp, duration) VALUES (?, ?, ?)',
                {session.identifier, session.startTime, duration})
                
            playerSessions[src].startTime = currentTime
            print("[HCYK_BOSSACTIONS] Updated playtime for: " .. session.identifier .. " (Duration: " .. duration .. " seconds)")
        end
    end
end)

local function normalizeCallbackParams(source, job, ...)
    local xPlayer = ESX.GetPlayerFromId(source)
    local jobName = job
    
    if type(job) == "table" then
        if job.job then
            jobName = job.job
        elseif job.name then
            jobName = job.name
        end
    end
    
    return xPlayer, jobName, ...
end

lib.callback.register('hcyk_bossactions:getEmployeesPlaytime', function(source, job)
    local xPlayer, jobName = normalizeCallbackParams(source, job)
    
    if not xPlayer or xPlayer.getJob().name ~= jobName or xPlayer.getJob().grade_name ~= 'boss' then
        return {}
    end
    
    local currentTime = os.time()
    local currentDate = os.date("*t", currentTime)
    local dayOfWeek = currentDate.wday - 1
    if dayOfWeek == 0 then dayOfWeek = 7 end 
    
    local secondsToSubtract = (dayOfWeek - 1) * 86400 + currentDate.hour * 3600 + currentDate.min * 60 + currentDate.sec
    local weekStartTime = currentTime - secondsToSubtract
    
    local employees = GetEmployees(jobName)
    local result = {}
    
    for _, employee in ipairs(employees) do
        local identifier = employee.identifier
        local weeklyPlaytime = 0
        
        local success, playtimeData = pcall(function()
            return MySQL.Sync.fetchAll(
                "SELECT SUM(duration) as total_time FROM player_playtime " ..
                "WHERE identifier = ? AND timestamp >= ?", 
                {identifier, weekStartTime}
            )
        end)
        
        if success and playtimeData and playtimeData[1] and playtimeData[1].total_time then
            weeklyPlaytime = math.floor(playtimeData[1].total_time / 3600 * 10) / 10
        end
        
        result[identifier] = weeklyPlaytime
    end
    
    return result
end)

lib.callback.register('hcyk_bossactions:getEmployeeNote', function(source, job, identifier)
    local xPlayer, jobName = normalizeCallbackParams(source, job)
    
    if not xPlayer or xPlayer.getJob().name ~= jobName or xPlayer.getJob().grade_name ~= 'boss' then
        return {success = false, message = "Nemáš oprávnění"}
    end
    
    local success, result = pcall(function()
        return MySQL.Sync.fetchAll("SELECT note FROM employee_notes WHERE employee_identifier = ?", {identifier})
    end)
    
    if success and result and #result > 0 then
        return {success = true, note = result[1].note}
    else
        return {success = true, note = ""}
    end
end)

lib.callback.register('hcyk_bossactions:saveEmployeeNote', function(source, job, identifier, note)
    local xPlayer, jobName = normalizeCallbackParams(source, job)
    
    if not xPlayer or xPlayer.getJob().name ~= jobName or xPlayer.getJob().grade_name ~= 'boss' then
        return {success = false, message = "Nemáš oprávnění"}
    end
    
    local success = pcall(function()
        MySQL.Sync.execute(
            "INSERT INTO employee_notes (employee_identifier, note) VALUES (?, ?) " ..
            "ON DUPLICATE KEY UPDATE note = ?", 
            {identifier, note, note}
        )
    end)
    
    if success then
        return {success = true, message = "Poznámka byla úspěšně uložena"}
    else
        return {success = false, message = "Nepodařilo se uložit poznámku"}
    end
end)