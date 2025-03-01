ESX = exports["es_extended"]:getSharedObject()

menuOpen = false  
local PlayerData = {}

local function normalizeJobParameter(data)
    if type(data) == "table" and data.job then
        if type(data.job) == "table" and data.job.job then
            data.job = data.job.job
        elseif type(data.job) == "table" and data.job.name then
            data.job = data.job.name
        end
    end
    return data
end

RegisterNetEvent('esx:playerLoaded')
AddEventHandler('esx:playerLoaded', function(xPlayer)
    PlayerData = xPlayer
end)

RegisterNetEvent('esx:setJob')
AddEventHandler('esx:setJob', function(job)
    PlayerData.job = job
end)

function debugPrint(...)
    if Config.Debug then print('[HCYK_BOSSACTIONS]', ...) end
end

function SetMenuOpen(state)
    menuOpen = state
    debugPrint("Menu state set to:", menuOpen)
end

function IsMenuOpen()
    return menuOpen
end

CreateThread(function()
    while ESX.GetPlayerData().job == nil do
        Citizen.Wait(100)
    end
    PlayerData = ESX.GetPlayerData()

    loadBossZones()
end)

RegisterNUICallback('getEmployees', function(data, cb)
    debugPrint('Fetching employees for job', data.job)
    data = normalizeJobParameter(data)
    
    lib.callback('hcyk_bossactions:getEmployees', false, function(employees)
        if employees then
            debugPrint('Received', #employees, 'employees')
            cb(employees)
        else
            debugPrint('No employees received')
            cb({})
        end
    end, data.job)
end)

RegisterNUICallback('hireEmployee', function(data, cb)
    debugPrint('Hiring employee for job', data.job, 'position', data.position)
    if not data.job or not data.player or not data.position then
        return cb({success = false, message = "Chybí potřebná data"})
    end
    
    local playerID = tonumber(data.player)
    local position = tonumber(data.position)
    
    if not playerID or not position then
        return cb({success = false, message = "Neplatné ID hráče nebo pozice"})
    end
    
    debugPrint('Hiring player ID', playerID, 'as', data.job, 'grade', position)
    
    lib.callback('hcyk_bossactions:hireEmployee', 5000, function(result)
        if not result then
            return cb({success = false, message = "Neznámá chyba při zaměstnávání"})
        end
        
        cb(result)
    end, data.job, playerID, position)
end)


local function safeToString(value)
    if value == nil then
        return "nil"
    elseif type(value) == "number" and (value ~= value or value == math.huge or value == -math.huge) then
        -- Check for NaN or infinity
        return tostring(0)
    else
        return tostring(value)
    end
end

-- Improve the fireEmployee callback
RegisterNUICallback('fireEmployee', function(data, cb)
    -- Ensure job is properly formatted
    local job = data.job
    if type(job) == "table" and job.job then
        job = job.job
    end
    
    -- Ensure identifier is a valid string
    local identifier = data.identifier
    if type(identifier) == "number" or identifier == "NaN" or identifier == "undefined" or identifier == "null" then
        identifier = safeToString(identifier)
    end
    
    debugPrint('Firing employee from job', job, 'ID', identifier)
    
    -- Validate data before sending
    if not job or job == "" or not identifier or identifier == "" or identifier == "NaN" or identifier == "undefined" or identifier == "null" then
        cb({success = false, message = "Neplatné údaje"})
        return
    end
    
    lib.callback('hcyk_bossactions:fireEmployee', 1000, function(result)
        cb(result or {success = false, message = "Unknown error"})
    end, job, identifier)
end)

RegisterNUICallback('getEmployeeNote', function(data, cb)
    data = normalizeJobParameter(data)
    
    local identifier = data.identifier
    if type(identifier) == "number" or identifier == "NaN" or identifier == "undefined" or identifier == "null" then
        identifier = safeToString(identifier)
    end
    
    debugPrint('Fetching employee note for', identifier)
    
    if not identifier or identifier == "" or identifier == "NaN" or identifier == "undefined" or identifier == "null" then
        cb({success = false, note = ""})
        return
    end
    
    lib.callback('hcyk_bossactions:getEmployeeNote', false, function(result)
        cb(result or {success = false, note = ""})
    end, data.job, identifier)
end)

RegisterNUICallback('saveEmployeeNote', function(data, cb)
    local job = data.job
    if type(job) == "table" and job.job then
        job = job.job
    end
    
    local identifier = data.identifier
    if type(identifier) == "number" or identifier == "NaN" or identifier == "undefined" or identifier == "null" then
        identifier = safeToString(identifier)
    end
    
    debugPrint('Saving note for employee', identifier, 'job', job)
    
    if not identifier or identifier == "" or identifier == "NaN" or identifier == "undefined" or identifier == "null" then
        cb({success = false, message = "Neplatný identifikátor zaměstnance"})
        return
    end
    
    lib.callback('hcyk_bossactions:saveEmployeeNote', 1000, function(result)
        cb(result or {success = false, message = "Unknown error"})
    end, job, identifier, data.note)
end)

RegisterNUICallback('setGrade', function(data, cb)
    debugPrint('Setting grade for employee in job', data.job)
    data = normalizeJobParameter(data)
    
    lib.callback('hcyk_bossactions:setGrade', false, function(result)
        cb(result or {success = false, message = "Unknown error"})
    end, data.job, data.identifier, data.level)
end)

RegisterNUICallback('setSalary', function(data, cb)
    debugPrint('Setting salary for grade in job', data.job)
    data = normalizeJobParameter(data)
    
    lib.callback('hcyk_bossactions:setSalary', false, function(result)
        cb(result or {success = false, message = "Unknown error"})
    end, data.job, data.level, data.salary)
end)

RegisterNUICallback('setEmployeeDetails', function(data, cb)
    debugPrint('Setting employee details for', data.identifier, 'level', data.level)
    
    local identifier = data.identifier
    if type(identifier) == "number" then
        identifier = tostring(identifier)
    end
    
    lib.callback('hcyk_bossactions:setGrade', 1000, function(result)
        if result and result.success then
            if data.salary then
                lib.callback('hcyk_bossactions:setSalary', 1000, function(salaryResult)
                    cb(salaryResult or {success = false, message = "Failed to update salary"})
                end, data.job, data.level, data.salary)
            else
                cb(result)
            end
        else
            cb(result or {success = false, message = "Unknown error"})
        end
    end, data.job, identifier, data.level)
end)


RegisterNUICallback('getEmployeesPlaytime', function(data, cb)
    debugPrint('Fetching employees playtime for job', data.job)
    data = normalizeJobParameter(data)
    
    lib.callback('hcyk_bossactions:getEmployeesPlaytime', false, function(result)
        cb(result or {})
    end, data.job)
end)

-- Finance-related callbacks
RegisterNUICallback('getSocietyMoney', function(data, cb)
    debugPrint('Fetching society money for job', data.job)
    data = normalizeJobParameter(data)
    
    lib.callback('hcyk_bossactions:getSocietyMoney', false, function(money)
        cb(money or 0)
    end, data.job)
end)

RegisterNUICallback('getFinancialStats', function(data, cb)
    debugPrint('Fetching financial stats for job', data.job)
    data = normalizeJobParameter(data)
    
    lib.callback('hcyk_bossactions:getFinancialStats', false, function(stats)
        if stats then
            cb(stats)
        else
            cb({income = 0, expenses = 0, netProfit = 0})
        end
    end, data.job, data.timeRange)
end)

-- Job management callbacks
RegisterNUICallback('getJobData', function(data, cb)
    debugPrint('Fetching job data for', data.job)
    data = normalizeJobParameter(data)
    
    lib.callback('hcyk_bossactions:getJobData', false, function(jobData)
        cb(jobData or {name = data.job, label = data.job, grades = {}})
    end, data.job)
end)

RegisterNUICallback('getRanks', function(data, cb)
    debugPrint('Fetching ranks for job', data.job)
    data = normalizeJobParameter(data)
    
    lib.callback('hcyk_bossactions:getRanks', false, function(ranks)
        if ranks then
            cb(ranks)
        else
            cb({})
        end
    end, data.job)
end)

RegisterNUICallback('createRank', function(data, cb)
    debugPrint('Creating new rank for job', data.job)
    data = normalizeJobParameter(data)
    
    lib.callback('hcyk_bossactions:createRank', false, function(result)
        cb(result or {success = false, message = "Unknown error"})
    end, data.job, data.data)
end)

RegisterNUICallback('updateRank', function(data, cb)
    debugPrint('Updating rank for job', data.job)
    data = normalizeJobParameter(data)
    
    lib.callback('hcyk_bossactions:updateRank', false, function(result)
        cb(result or {success = false, message = "Unknown error"})
    end, data.job, data.grade, data.data)
end)

RegisterNUICallback('deleteRank', function(data, cb)
    debugPrint('Deleting rank from job', data.job)
    data = normalizeJobParameter(data)
    
    lib.callback('hcyk_bossactions:deleteRank', false, function(result)
        cb(result or {success = false, message = "Unknown error"})
    end, data.job, data.grade)
end)

RegisterNUICallback('updateJobSettings', function(data, cb)
    debugPrint('Updating job settings for', data.job)
    
    lib.callback('hcyk_bossactions:updateJobSettings', 1000, function(result)
        cb(result or {success = false, message = "Unknown error"})
    end, data.job, data.data)
end)

-- Employee notes callbacks
RegisterNUICallback('getEmployeeNote', function(data, cb)
    debugPrint('Fetching employee note for', data.identifier)
    data = normalizeJobParameter(data)
    
    lib.callback('hcyk_bossactions:getEmployeeNote', false, function(result)
        cb(result or {success = false, note = ""})
    end, data.job, data.identifier)
end)

RegisterNUICallback('saveEmployeeNote', function(data, cb)
    debugPrint('Saving note for employee', data.identifier, 'job', data.job)
    
    local identifier = data.identifier
    if type(identifier) == "number" then
        identifier = tostring(identifier)
    end
    
    lib.callback('hcyk_bossactions:saveEmployeeNote', 1000, function(result)
        cb(result or {success = false, message = "Unknown error"})
    end, data.job, identifier, data.note)
end)

-- Misc callbacks
RegisterNUICallback('getNearbyPlayers', function(data, cb)
    debugPrint('Fetching nearby players for job', data.job)
    data = normalizeJobParameter(data)
    
    lib.callback('hcyk_bossactions:getNearbyPlayers', false, function(players)
        cb(players or {})
    end, data.job)
end)

RegisterNUICallback('showNotification', function(data, cb)
    cb({success = true})
end)

RegisterNUICallback('hideUI', function(_, cb)
    debugPrint("hideUI callback called, setting menu state to closed")
    
    SetMenuOpen(false)
    SetNuiFocus(false, false)
    
    cb({success = true})
    
    SendNUIMessage({
        action = 'setVisible',
        data = false
    })
    
    Citizen.SetTimeout(500, function()
        if IsMenuOpen() then
            debugPrint("WARNING: Menu still shows as open after hideUI!")
            SetMenuOpen(false)
        else
            debugPrint("Menu successfully closed")
        end
    end)
end)

function ResetMenuState()
    debugPrint("Resetting menu state")
    menuOpen = false
    SetNuiFocus(false, false)
    SendNUIMessage({
        action = 'setVisible',
        data = false
    })
    debugPrint("Menu state after reset:", IsMenuOpen())
end

RegisterNetEvent('hcyk_bossmenu:resetState')
AddEventHandler('hcyk_bossmenu:resetState', function()
    ResetMenuState()
end)