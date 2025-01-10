import { useContext } from "react";
import { AuthContext } from "../../context/AuthProvider";

const AllTask = () => {
  const [userData, setUserData] = useContext(AuthContext);

  return (
    <div id="allTask" className="bg-[#1c1c1c] p-5 mt-5 rounded">
      <div className="bg-red-400 mb-2 py-2 px-4 flex justify-between rounded">
        <h2 className="w-1/5 text-lg font-medium">Employee Name</h2>
        <h3 className="w-1/5 text-lg font-medium">New Task</h3>
        <h5 className="w-1/5 text-lg font-medium">Active Task</h5>
        <h5 className="w-1/5 text-lg font-medium">Completed</h5>
        <h5 className="w-1/5 text-lg font-medium">Failed</h5>
      </div>

      <div>
        {userData.map((elem, idx) => (
          <div
            key={idx}
            className="bg-[#1c1c1c] border-2 border-emerald-700 mb-2 py-2 px-4 flex justify-between rounded"
          >
            <h2 className="w-1/5">{elem.firstName}</h2>
            <h3 className="text-lg font-medium w-1/5 text-blue-400">
              {elem.taskNumbers?.newTask ?? 0}
            </h3>
            <h5 className="text-lg font-medium w-1/5 text-yellow-400">
              {elem.taskNumbers?.active ?? 0}
            </h5>
            <h5 className="text-lg font-medium w-1/5 text-white">
              {elem.taskNumbers?.completed ?? 0}
            </h5>
            <h5 className="text-lg font-medium w-1/5 text-red-600">
              {elem.taskNumbers?.failed ?? 0}
            </h5>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AllTask;
