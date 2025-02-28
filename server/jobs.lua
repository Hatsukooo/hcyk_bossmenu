function GetJobData(job)
    local result = SafeMySQL.fetch('SELECT * FROM `jobs` WHERE `name` = ?', { job }, {})
    
    if result and #result > 0 then
        local data = result[1]
        local grades = SafeMySQL.fetch('SELECT * FROM `job_grades` WHERE `job_name` = ? ORDER BY `grade` ASC', { job }, {})
        
        if grades and #grades > 0 then
            data.grades = grades
        else
            data.grades = {}
        end
        
        return data
    end
    
    return {
        name = job,
        label = job,
        grades = {}
    }
end

function GetEmployees(job)
    local result = {}
    local success = false
    
    local query1 = [[
        SELECT 
            u.identifier, 
            u.firstname, 
            u.lastname, 
            jg.grade, 
            jg.name AS grade_name, 
            jg.label AS grade_label,
            jg.salary
        FROM 
            users u
        JOIN 
            job_grades jg ON u.job_grade = jg.grade AND jg.job_name COLLATE utf8mb4_general_ci = u.job COLLATE utf8mb4_general_ci
        WHERE 
            u.job = ?
        ORDER BY 
            jg.grade DESC
    ]]
    
    success, result = pcall(function()
        return MySQL.Sync.fetchAll(query1, { job })
    end)
    
    if success and result and #result > 0 then
        print("[HCYK_BOSSACTIONS] First query successful, found " .. #result .. " employees")
        return result
    end
    
    -- Second attempt - Without collation specifics
    local query2 = [[
        SELECT 
            u.identifier, 
            u.firstname, 
            u.lastname, 
            jg.grade, 
            jg.name AS grade_name, 
            jg.label AS grade_label,
            jg.salary
        FROM 
            users u, job_grades jg 
        WHERE 
            u.job_grade = jg.grade 
            AND jg.job_name = ? 
            AND u.job = ?
        ORDER BY 
            jg.grade DESC
    ]]
    
    success, result = pcall(function()
        return MySQL.Sync.fetchAll(query2, { job, job })
    end)
    
    if success and result and #result > 0 then
        print("[HCYK_BOSSACTIONS] Second query successful, found " .. #result .. " employees")
        return result
    end
    
    local employees = {}
    success, employees = pcall(function()
        local users = MySQL.Sync.fetchAll("SELECT identifier, firstname, lastname, job_grade FROM users WHERE job = ?", { job })
        local employeesList = {}
        
        for _, user in ipairs(users) do
            local gradeInfo = MySQL.Sync.fetchAll("SELECT grade, name AS grade_name, label AS grade_label, salary FROM job_grades WHERE job_name = ? AND grade = ?", 
                { job, user.job_grade })
                
            if gradeInfo and gradeInfo[1] then
                table.insert(employeesList, {
                    identifier = user.identifier,
                    firstname = user.firstname,
                    lastname = user.lastname,
                    grade = gradeInfo[1].grade,
                    grade_name = gradeInfo[1].grade_name,
                    grade_label = gradeInfo[1].grade_label,
                    salary = gradeInfo[1].salary
                })
            end
        end
        
        table.sort(employeesList, function(a, b)
            return a.grade > b.grade
        end)
        
        return employeesList
    end)
    
    if success and employees and #employees > 0 then
        print("[HCYK_BOSSACTIONS] Third query successful, found " .. #employees .. " employees")
        return employees
    end
    
    print("[HCYK_BOSSACTIONS] All queries failed, returning empty employee list")
    return {}
end

local function handleAsyncCallback(cb, success, message)
    cb({
        success = success,
        message = message or (success and "Operation successful" or "Operation failed")
    })
end

lib.callback.register('hcyk_bossactions:hireEmployee', function(source, job, identifier, grade)
    local xPlayer = ESX.GetPlayerFromId(source)
    if not xPlayer or xPlayer.getJob().name ~= job or xPlayer.getJob().grade_name ~= 'boss' then
        return {success = false, message = "Nemáš oprávnění"}
    end
    
    local targetPlayer = ESX.GetPlayerFromIdentifier(identifier)
    if targetPlayer then
        targetPlayer.setJob(job, grade)
        
        TriggerClientEvent('esx:showNotification', targetPlayer.source, 'Byl jsi zaměstnán jako ' .. job)
        
        return {success = true, message = "Hráč byl úspěšně zaměstnán"}
    else
        local result = MySQL.Sync.execute('UPDATE users SET job = ?, job_grade = ? WHERE identifier = ?', {
            job, grade, identifier
        })
        
        if result and result > 0 then
            return {success = true, message = "Hráč byl úspěšně zaměstnán"}
        else
            return {success = false, message = "Hráč nebyl nalezen"}
        end
    end
end)

lib.callback.register('hcyk_bossactions:fireEmployee', function(source, job, identifier)
    local xPlayer = ESX.GetPlayerFromId(source)
    
    print("Fire request: ", source, job, identifier)
    print("Player job data: ", xPlayer.getJob().name, xPlayer.getJob().grade_name)
    
    if type(job) == "table" and job.job then
        job = job.job
    end
    
    if not xPlayer or xPlayer.getJob().name ~= job or xPlayer.getJob().grade_name ~= 'boss' then
        return {success = false, message = "Nemáš oprávnění"}
    end
    
    local targetPlayer = ESX.GetPlayerFromIdentifier(identifier)
    if targetPlayer then
        targetPlayer.setJob('unemployed', 0)
        
        TriggerClientEvent('esx:showNotification', targetPlayer.source, 'Byl jsi propuštěn z práce ' .. job)
        
        return {success = true, message = "Hráč byl úspěšně propuštěn"}
    else
        local result = MySQL.Sync.execute('UPDATE users SET job = ?, job_grade = ? WHERE identifier = ? AND job = ?', {
            'unemployed', 0, identifier, job
        })
        
        if result and result > 0 then
            return {success = true, message = "Hráč byl úspěšně propuštěn"}
        else
            return {success = false, message = "Hráč nebyl nalezen nebo není ve vaší firmě"}
        end
    end
end)

lib.callback.register('hcyk_bossactions:setGrade', function(source, job, identifier, grade)
    local xPlayer = ESX.GetPlayerFromId(source)
    if not xPlayer or xPlayer.getJob().name ~= job or xPlayer.getJob().grade_name ~= 'boss' then
        return {success = false, message = "Nemáš oprávnění"}
    end
    
    local targetPlayer = ESX.GetPlayerFromIdentifier(identifier)
    if targetPlayer then
        targetPlayer.setJob(job, grade)
        
        TriggerClientEvent('esx:showNotification', targetPlayer.source, 'Tvá pozice ve firmě ' .. job .. ' byla změněna')
        
        return {success = true, message = "Pozice hráče byla úspěšně změněna"}
    else
        local result = MySQL.Sync.execute('UPDATE users SET job_grade = ? WHERE identifier = ? AND job = ?', {
            grade, identifier, job
        })
        
        if result and result > 0 then
            return {success = true, message = "Pozice hráče byla úspěšně změněna"}
        else
            return {success = false, message = "Hráč nebyl nalezen nebo není ve vaší firmě"}
        end
    end
end)

lib.callback.register('hcyk_bossactions:setSalary', function(source, job, grade, salary)
    local xPlayer = ESX.GetPlayerFromId(source)
    if not xPlayer or xPlayer.getJob().name ~= job or xPlayer.getJob().grade_name ~= 'boss' then
        return {success = false, message = "Nemáš oprávnění"}
    end
    
    local result = MySQL.Sync.execute('UPDATE job_grades SET salary = ? WHERE job_name = ? AND grade = ?', {
        salary, job, grade
    })
    
    if result and result > 0 then
        return {success = true, message = "Plat byl úspěšně změněn"}
    else
        return {success = false, message = "Pozice nebyla nalezena"}
    end
end)

lib.callback.register('hcyk_bossactions:getRanks', function(source, job)
    local xPlayer = ESX.GetPlayerFromId(source)
    if not xPlayer or xPlayer.getJob().name ~= job or xPlayer.getJob().grade_name ~= 'boss' then
        return {}
    end
    
    local ranks = MySQL.Sync.fetchAll('SELECT * FROM job_grades WHERE job_name = ? ORDER BY grade ASC', {job})
    return ranks or {}
end)

lib.callback.register('hcyk_bossactions:createRank', function(source, job, data)
    local xPlayer = ESX.GetPlayerFromId(source)
    if not xPlayer or xPlayer.getJob().name ~= job or xPlayer.getJob().grade_name ~= 'boss' then
        return {success = false, message = "Nemáš oprávnění"}
    end
    
    local maxGrade = MySQL.Sync.fetchScalar('SELECT MAX(grade) FROM job_grades WHERE job_name = ?', {job})
    local newGrade = (tonumber(maxGrade) or 0) + 1
    
    local success = MySQL.Sync.execute('INSERT INTO job_grades (job_name, grade, name, label, salary) VALUES (?, ?, ?, ?, ?)', {
        job, newGrade, data.name, data.label, data.salary
    })
    
    if success then
        return {success = true, message = "Hodnost byla úspěšně vytvořena"}
    else
        return {success = false, message = "Nepodařilo se vytvořit hodnost"}
    end
end)

lib.callback.register('hcyk_bossactions:updateRank', function(source, job, grade, data)
    local xPlayer = ESX.GetPlayerFromId(source)
    if not xPlayer or xPlayer.getJob().name ~= job or xPlayer.getJob().grade_name ~= 'boss' then
        return {success = false, message = "Nemáš oprávnění"}
    end
    
    local result = MySQL.Sync.execute('UPDATE job_grades SET name = ?, label = ?, salary = ? WHERE job_name = ? AND grade = ?', {
        data.name, data.label, data.salary, job, grade
    })
    
    if result then
        return {success = true, message = "Hodnost byla úspěšně upravena"}
    else
        return {success = false, message = "Nepodařilo se upravit hodnost"}
    end
end)

lib.callback.register('hcyk_bossactions:deleteRank', function(source, job, grade)
    local xPlayer = ESX.GetPlayerFromId(source)
    if not xPlayer or xPlayer.getJob().name ~= job or xPlayer.getJob().grade_name ~= 'boss' then
        return {success = false, message = "Nemáš oprávnění"}
    end
    
    local employeesCount = MySQL.Sync.fetchScalar('SELECT COUNT(*) FROM users WHERE job = ? AND job_grade = ?', {job, grade})
    
    if employeesCount > 0 then
        return {success = false, message = "Nemůžeš smazat hodnost, kterou používají zaměstnanci"}
    end
    
    local result = MySQL.Sync.execute('DELETE FROM job_grades WHERE job_name = ? AND grade = ?', {job, grade})
    
    if result then
        MySQL.Async.execute('UPDATE job_grades SET grade = grade - 1 WHERE job_name = ? AND grade > ?', {job, grade})
        return {success = true, message = "Hodnost byla úspěšně smazána"}
    else
        return {success = false, message = "Nepodařilo se smazat hodnost"}
    end
end)

lib.callback.register('hcyk_bossactions:getJobData', function(source, job)
    local xPlayer = ESX.GetPlayerFromId(source)
    if not xPlayer or xPlayer.getJob().name ~= job or xPlayer.getJob().grade_name ~= 'boss' then
        return nil
    end
    
    local jobData = GetJobData(job)
    
    return jobData
end)

lib.callback.register('hcyk_bossactions:updateJobSettings', function(source, job, data)
    local xPlayer = ESX.GetPlayerFromId(source)
    if not xPlayer or xPlayer.getJob().name ~= job or xPlayer.getJob().grade_name ~= 'boss' then
        return {success = false, message = "Nemáš oprávnění"}
    end
    
    if data.label and data.label ~= '' then
        local success = SafeMySQL.execute('UPDATE `jobs` SET label = ? WHERE name = ?', {data.label, job})
        
        if success then
            return {success = true, message = "Název frakce byl úspěšně změněn"}
        else
            return {success = false, message = "Nepodařilo se změnit název frakce"}
        end
    end
    
    return {success = true, message = "Žádné změny k uložení"}
end)

lib.callback.register('hcyk_bossactions:saveEmployeeNote', function(source, job, identifier, note)
    local xPlayer = ESX.GetPlayerFromId(source)
    
    if not xPlayer or xPlayer.getJob().name ~= job or xPlayer.getJob().grade_name ~= 'boss' then
        return {success = false, message = "Nemáš oprávnění"}
    end
    
    local success = false
    
    success = MySQL.Sync.execute(
        "INSERT INTO employee_notes (employee_identifier, note) VALUES (?, ?) " ..
        "ON DUPLICATE KEY UPDATE note = ?", 
        {identifier, note, note}
    )
    
    if success then
        return {success = true, message = "Poznámka byla úspěšně uložena"}
    else
        return {success = false, message = "Nepodařilo se uložit poznámku"}
    end
end)

lib.callback.register('hcyk_bossactions:getEmployeeNote', function(source, job, identifier)
    local xPlayer = ESX.GetPlayerFromId(source)
    
    if not xPlayer or xPlayer.getJob().name ~= job or xPlayer.getJob().grade_name ~= 'boss' then
        return {success = false, message = "Nemáš oprávnění"}
    end
    
    local result = MySQL.Sync.fetchAll("SELECT note FROM employee_notes WHERE employee_identifier = ?", {identifier})
    
    if result and #result > 0 then
        return {success = true, note = result[1].note}
    else
        return {success = true, note = ""}
    end
end)

lib.callback.register('hcyk_bossactions:getEmployeesPlaytime', function(source, job)
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
    
    local employees = GetEmployees(job)
    local result = {}
    
    for _, employee in ipairs(employees) do
        local identifier = employee.identifier
        local weeklyPlaytime = 0
        
        local playtimeData = MySQL.Sync.fetchAll(
            "SELECT SUM(duration) as total_time FROM player_playtime " ..
            "WHERE identifier = ? AND timestamp >= ?", 
            {identifier, weekStartTime}
        )
        
        if playtimeData and playtimeData[1] and playtimeData[1].total_time then
            weeklyPlaytime = math.floor(playtimeData[1].total_time / 3600 * 10) / 10
        end
        
        result[identifier] = weeklyPlaytime
    end
    
    return result
end)
